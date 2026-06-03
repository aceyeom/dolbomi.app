# 03 · 기회 엔진 (Opportunity Engine) — 센터피스

> **상태 박스**
> 우선순위: 빌드 순서 2번. **이게 전부의 베팅.** 경로가 제네릭하면 여기서 멈추고 고친다.
> 의존성: 카탈로그([04](./04-catalog/README.md)), 체크인 컨텍스트([01](./01-core-loop.md)), 스탯([02](./02-stats.md)), 리퍼럴([06](./06-referral-engine.md)).
> 미해결 질문(Phase 2 후보): 재계획 임계값 수치, 모델 라우팅 비용, 경로 캐시 무효화 규칙, 비현실 피드백의 UX.

이 파트가 MVP의 심장이다. AI가 *필수적으로* 쓰이는 유일한 곳이고, 빌드 노력이 집중되는 곳.

---

## 3.1 Opportunity란 무엇인가 — 데이터 모델

```jsonc
Opportunity {
  id, title, category,          // 창업 | 자격증 | 어학 | 학점 | 금융 | 체력 | 봉사 | 취업 | 정신전력
  stat,                         // 먹이는 1차 스탯
  what,                         // 한 문단 평이한 설명
  eligibility,                  // 군별 / 계급 / 선행조건 — 셀프 필터용으로 표시, 절대 수집 안 함
  rewards: [                    // 타입드, 복수
    { type: "휴가", days: [2,5], note: "본선 수상자, 부대 내규" },
    { type: "cert" | "money" | "학점" | "résumé" | "prize", value }
  ],
  schedule: { deadline, window, frequency },   // D-day 구동; "live" — source에서 갱신
  cost: { amount, gov_funded: "자기개발비" | "무료" | null },
  apply_where,                  // 정확한 포털/앱/사이트
  partner_service_id,           // → 리퍼럴 엔진(06), nullable
  source_url,                   // 진실의 출처, 신뢰성 + 갱신용
  difficulty                    // 1–5
}
```

## 3.2 상세 진행바 — 서브 기능

진행바는 D-day 다음으로 가장 많이 보는 객체다. AI가 생성한 경로(§3.3)를 렌더한다:

- **Fill** = 서브퀘스트 완료 %, 노력 가중.
- **페이싱 마커** — "`{date}` 까지 여기쯤이어야 한다" 틱. 마커와 fill의 간격이 행동 동력.
- **상태** — 🟢 on track / 🟡 tight / 🔴 at risk → 재계획 넛지 트리거.
- **마일스톤 핍(pips)** — 바 위에 점, 탭하면 서브퀘스트 펼침.
- **보상은 결승선에 고정** — 휴가 일수 / 자격증 / 상금이 끝에 항상 보인다.
- **재계획 버튼** — 🟡/🔴 일 때.
- **서비스 점프** — `partner_service_id` 를 가진 서브퀘스트는 제휴 앱으로 딥링크(→ [06](./06-referral-engine.md)), 2단계 완료로 복귀.

## 3.3 퀘스트 경로 생성기 — Claude API의 일

API가 필수인 유일한 자리이자, 빌드 노력이 집중되는 곳.

**모델:** 비용을 위해 `claude-sonnet` 급(호출은 아래처럼 bounded). 고위험 기회(예: 창업대회)의 *최초 계획* 에만 더 강한 모델로 에스컬레이션.

**시스템 프롬프트 (스케치):**
> 너는 가용 시간이 적은 ROK 병사를 위한 계획 엔진이다. 진짜 기회, 그 마감, 병사의 현재 레벨·주간 가용 분(minutes)·최근 완료율이 주어지면, 목표까지 사다리처럼 이어지는 현실적이고 날짜가 박힌 퀘스트 경로를 출력하라. 퀘스트는 원자적이고 에너지 사이즈여야 한다(S ≤5분 / M ~20분 / L ~45분). 정직하라: 병사의 실제 페이스로 마감이 불가능하면 그렇다고 말하고, 주간 시간을 더 늘리거나 다음 사이클을 제안하라. **JSON만** 출력, 산문 없이, 스키마에 맞춰서. 계획을 최근 완료율에 근거하라 — 지친 병사가 튕겨낼 스케줄은 절대 만들지 마라.

**입력 번들:**
```jsonc
{ opportunity, days_remaining, goal_text,
  current_level, weekly_minutes_available, recent_completion_rate_7d, recent_completion_rate_14d }
```

**출력 스키마 (바에 그대로 파싱):**
```jsonc
{
  milestones: [ { title, target_date, why } ],
  subquests:  [ { milestone_id, text, size: "S"|"M"|"L", xp, stat,
                  service_link?: partner_service_id, target_date } ],
  pace_plan:  [ { date, expected_pct } ],          // → 페이싱 마커
  feasibility: "on_track" | "tight" | "unrealistic",
  feasibility_note,                                 // tight/unrealistic 시 정직한 메시지
  next_3: [subquest_id, subquest_id, subquest_id]   // 오늘 밤 후보
}
```

**재계획 트리거 (이벤트 구동, 매 세션 아님):** 페이스 임계 미달 · 마감 이동 · 저에너지 체크인 3회 연속 · 사용자가 재계획 탭 · 마일스톤 조기 완료(에스컬레이션). 트리거 시 컨텍스트 + `completed_subquests` + `actual_pace` 재전송 → 여전히 마감을 맞추도록 재배열, 아니면 진실을 말한다.

**비용 통제 (단위경제에 결정적):**
- 경로는 **한 번 생성되고 캐시된다.** API는 재계획 트리거에만 발사.
- 야간 *오늘 밤의 3* 픽은 캐시된 `next_3` 를 에너지로 필터한 **결정론적 선택** — *LLM 호출 없음.*
- "한 줄"(→ [01](./01-core-loop.md) §1.5)과 월간 결산 카피(→ [07](./07-monthly-recap.md))는 같은 컨텍스트에서 싼 템플릿/배치 호출.
- 결과: API 지출은 **재계획 수** 에 비례, 일일 오픈이 아니라 — bounded, 스케일에서 저렴.

## 3.4 휴가 사다리 (the hook)

사용자의 자격 기회들에서 `reward.type == "휴가"` 를 전부 하나의 숫자로 집계하는 전용 뷰: **"네가 딸 수 있는 추가 휴가: 최대 N일."** 각 단(rung)은 그 기회 경로로 링크. 냉소적인 병사를 전향시키는 표면 — *"자기계발"* 이 아니라 *"시스템을 이겨 집에 더 있기"* 로 읽힌다.

> **정직성 규칙:** 자기계발 포상휴가는 거의 모든 곳에서 **부대 내규**(지휘관 재량)이지, 보장된 국가 권리가 아니다. 사다리는 일수를 범위로 표시("보통 2~5일, 부대별 상이")하고 절대 약속하지 않는다. 이 청중에게 휴가를 과약속하는 건 신뢰를 잃는 가장 빠른 길이다. (→ [10](./10-honesty-notes.md))
