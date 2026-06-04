# 08 · 데이터 모델 (Data Models)

> **상태 박스**
> 우선순위: 빌드 전반의 기반. 코어 루프와 함께.
> 의존성: 모든 파트. (Opportunity는 [03](./03-opportunity-engine.md) §3.1 참조)
> 미해결 질문: §8.5 참조.

빌드 가능하도록 핵심 스키마를 한곳에 모은다. **코드 식별자·필드명은 영어 유지**, 값/표시는 한국어 가능.

---

## 8.0 약점 / 리스크 (먼저 솔직하게)

1. **민감정보를 모델이 권하면 안 된다.** 스키마에 부모소득·카드데이터 필드를 두는 순간 v3 함정으로 회귀. → 해결: `User` 는 **최소 필드만**, 자격 판정은 클라이언트 셀프 필터(→ [05](./05-benefits-hub.md) §5.1)로 *저장 없이*. journal·민감 자격은 텔레메트리 제외(§8.3).
2. **카탈로그 사실 vs 사용자 진척의 경계가 흐리면 환각이 샌다.** `Opportunity`(공유 사실)와 `UserOpportunity`(개인 진척)를 안 나누면 LLM이 사실을 덮어쓸 여지. → 해결: **사실은 `Opportunity` 만 소유**(읽기 전용 주입), 생성기 출력은 `UserOpportunity.path` 에만(§8.1, → [03](./03-opportunity-engine.md) §3.4).
3. **브라우저 스토리지 의존 = 데이터 증발.** 프로토타입이 localStorage에 의존하면 기기 교체·캐시 삭제로 진척 소멸. → 해결: **앱 백엔드에 persist**(§8.4). 군 사용자는 기기/유심 교체가 잦음.
4. **stale 데이터가 조용히 늙는다.** `verified_at` 없는 사실은 틀린 줄도 모르고 신뢰를 깎음. → 해결: 모든 사실 필드에 `source_url` + `verified_at` 동반(§8.1), 허브/바가 90일 경과를 플래그.
5. **idempotency 없는 보상 트랜잭션.** 중복 완료/중복 postback이 XP·매출을 부풀림. → 해결: `Quest.completed_at` 단일성 + postback `(user,service,event)` 유니크(§8.2, → [06](./06-referral-engine.md) §6.3).

---

## 8.1 핵심 스키마

```jsonc
User { id, 군별, enlist_date, discharge_date, goal_text,
       stat_targets: {body,mind,money,craft,people,edge} }
       // 최소 필드. 민감정보(소득·카드 등) 저장 안 함 (→ 05, 10)

DailyCheckin { user_id, date, mood:1..5, energy:"low"|"mid"|"high", journal_line? }
       // 하루 1행(덮어쓰기). journal_line은 옵셔널·텔레메트리 제외

Stat { user_id, key:"body"|"mind"|"money"|"craft"|"people"|"edge", xp, level }
       // level = floor(sqrt(xp/100))  (→ 02 §2.2)

Opportunity { ...Part 03 §3.1... }              // 카탈로그(공유 사실, Part 04에서 시드)
       // source_url + verified_at 필수. 생성기는 읽기만, 쓰지 않음

UserOpportunity { user_id, opportunity_id, status,
                  path: <생성기 출력 03 §3.4>, actual_pace, started_at, avoided? }
       // status: browsing→committed→active→(at_risk)→completed|abandoned|expired
       // avoided: 7일 무활동 플래그 (→ 02 §2.4 담력 XP)

Quest { id, user_id, text, size:"S"|"M"|"L", xp, stat,
        source: "habit" | {opportunity_id, subquest_id},
        partner_service_id?, status:"open"|"done"|"verified", completed_at }
       // xp는 호스트가 size로 결정(LLM값 폐기, → 03 §3.4)

PartnerService { id, name, domain, deep_link_template, attribution_type, payout }
       // attribution_type: "CPI"|"CPA"|"rev-share" (→ 06)

Streak { user_id, count, last_completed, freezes_left }
       // 통제일 보존·월1 프리즈 (→ 01 §1.6)
```

## 8.2 관계 + 불변식

- `User 1—N Stat`(키별 1행), `User 1—N DailyCheckin`(날짜별 1행), `User 1—N UserOpportunity`.
- `Opportunity N—1 PartnerService`(via `partner_service_id`, nullable).
- `Quest.source` 가 기회면 `{opportunity_id, subquest_id}` 가 실제 `UserOpportunity.path` 노드를 가리켜야 함(참조 무결성, → [03](./03-opportunity-engine.md) §3.4).
- **불변식:** `Quest.xp` = `xp(size)`(호스트 계산) · `Stat.level` = `floor(sqrt(xp/100))` · 완료는 `completed_at` 단일 · postback `(user,service,event)` 유니크(idempotent, §8.0-5).

## 8.3 개인정보 경계 (저장하는 것 / 안 하는 것)

| 저장 O | 저장 X (의도적) |
|---|---|
| 군별, 입대/전역일, 목표 텍스트 | 부모 소득, 카드/계좌 데이터 |
| mood/energy(집계), 스탯 XP | 민감 자격(개별 신상), 위치 |
| 퀘스트 완료/검증 이벤트 | journal 텍스트(텔레메트리에서) |

자격 판정은 **클라이언트 셀프 필터**(→ [05](./05-benefits-hub.md) §5.1) — 입력은 메모리에만. 텔레메트리는 엔진 품질용 최소 집계만(→ [03](./03-opportunity-engine.md) §3.9).

## 8.4 저장 / 영속화

> **저장 노트:** 어떤 아티팩트 프로토타입이든 **앱 백엔드에 persist**. 브라우저 스토리지에 의존하지 말 것(§8.0-3) — 군 사용자는 기기/유심 교체가 잦고, 진척 소멸은 곧 이탈.

- 생성기 경로(`UserOpportunity.path`)는 **캐시**되고 재계획에만 갱신(→ [03](./03-opportunity-engine.md) §3.6) — 비용/일관성.
- 카탈로그(`Opportunity`)는 공유 테이블, 시드는 [04](./04-catalog/README.md)에서.

## 8.5 미해결 질문 (Phase 2/실데이터)

- 인덱스/관계 정의(쿼리 패턴 확정 후), 마이그레이션 전략.
- 서버 백엔드 선택(매니지드 vs 자체) + 오프라인-우선 동기화.
- 카탈로그 `Opportunity` 갱신이 진행 중 `UserOpportunity.path` 에 미치는 영향(→ [03](./03-opportunity-engine.md) §3.10과 공유).
- 텔레메트리 집계 스키마(민감정보 0 보장 검증).
