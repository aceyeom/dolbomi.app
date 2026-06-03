# 08 · 데이터 모델 (Data Models)

> **상태 박스**
> 우선순위: 빌드 전반의 기반. 코어 루프와 함께.
> 의존성: 모든 파트. (Opportunity는 [03](./03-opportunity-engine.md) §3.1 참조)
> 미해결 질문(Phase 2 후보): 인덱스/관계 정의, 마이그레이션 전략, 서버 백엔드 선택.

빌드 가능하도록 핵심 스키마를 한곳에 모은다. (코드 식별자·필드명은 영어 유지)

---

```jsonc
User { id, 군별, enlist_date, discharge_date, goal_text,
       stat_targets: {body,mind,money,craft,people,edge} }

DailyCheckin { user_id, date, mood, energy, journal_line? }

Stat { user_id, key, xp, level }

Opportunity { ...Part 03 §3.1... }              // 카탈로그(공유, Part 04에서 시드)

UserOpportunity { user_id, opportunity_id, status,
                  path: <생성기 출력 03 §3.3>, actual_pace, started_at }

Quest { id, user_id, text, size, xp, stat,
        source: "habit" | {opportunity_id, subquest_id},
        partner_service_id?, status, completed_at }

PartnerService { id, name, domain, deep_link_template, attribution_type, payout }

Streak { user_id, count, last_completed, freezes_left }
```

> **저장 노트:** 어떤 아티팩트 프로토타입이든 앱 백엔드에 persist. 브라우저 스토리지에 의존하지 말 것.
