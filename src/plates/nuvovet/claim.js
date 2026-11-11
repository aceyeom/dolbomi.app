// One claim, as NuvoVet's engine read it. Every figure here is copied from
// the product's own synthetic batch (nuvovet_systems
// frontend/src/data/claimsDemoSnapshot.json, claim SYN-2026-00220, engine
// 0.1.0): the receipt as the clinic typed it, the code each line was read
// as, the regional benchmark it was held against, and the decision.
//
// Nothing is a real clinic, patient or claim, and the benchmarks are the
// product's seed estimates, not a published fee schedule. The English is a
// gloss added here; the product itself is Korean.

export const CLAIM = {
  id: 'SYN-2026-00220',
  clinic: '샘플동물병원 32',
  region: '서울',
  date: '2026-09-17',
  patient: '토이푸들 3.9세 3.1kg',
  patientEn: 'Toy poodle, 3.9 years, 3.1 kg',
  diagnosis: '위장관 이물',
  diagnosisEn: 'Gastrointestinal foreign body',
  billed: 7383700,
  payable: 5000000,
  atRisk: 3176100,
  findings: 9,
  decision: 'review',
  decisionKo: '심사 필요',
}

// kind 'fee': a procedure, read to a standard code and held against the region's fees
// kind 'drug': a medicine, read to its ingredient
export const LINES = [
  { raw: '야간 응급 진찰', qty: 1, unit: 99200, kind: 'fee', code: 'CON-004', name: '야간·응급 진찰료', en: 'Night and emergency consultation', pct: 98, median: 33600, p90: 67200, risk: 32000 },
  { raw: '검사-X-ray 2컷', qty: 2, unit: 123000, kind: 'fee', code: 'IMG-001', name: '방사선 촬영', en: 'Radiography', pct: 100, median: 35800, p90: 56000, risk: 134000 },
  { raw: '복부 초음파 검사', qty: 1, unit: 144700, kind: 'fee', code: 'IMG-002', name: '복부 초음파', en: 'Abdominal ultrasound', pct: 97, median: 67200, p90: 112000, risk: 32700 },
  { raw: '혈액 검사 CBC', qty: 1, unit: 134300, kind: 'fee', code: 'LAB-001', name: '일반혈액검사 (CBC)', en: 'Complete blood count', pct: 100, median: 39200, p90: 56000, risk: 78300 },
  { raw: '마취(호흡)', qty: 1, unit: 413100, kind: 'fee', code: 'ANE-001', name: '호흡 마취', en: 'Inhalation anaesthesia', pct: 99, median: 168000, p90: 280000, risk: 133100 },
  { raw: '장절개술(이물)', qty: 1, unit: 4727600, kind: 'fee', code: 'SUR-003', name: '위장관 이물 제거술', en: 'Removal of a gastrointestinal foreign body', pct: 100, median: 1680000, p90: 2800000, risk: 1927600 },
  { raw: '입원-소형견(1일)', qty: 4, unit: 268900, kind: 'fee', code: 'HOS-001', name: '입원비 (일반, 1일)', en: 'Hospitalisation, general, per day', pct: 100, median: 67200, p90: 112000, risk: 627600 },
  { raw: '정맥 수액 처치', qty: 4, unit: 125500, kind: 'fee', code: 'TRT-001', name: '정맥 수액처치', en: 'Intravenous fluid therapy', pct: 100, median: 44800, p90: 72800, risk: 210800 },
  {
    raw: 'Buprenorphine inj', qty: 1, unit: 22000, kind: 'drug', code: 'buprenorphine', name: '부프레노르핀', en: 'Buprenorphine',
    note: 'Read as a medicine, not a procedure. The receipt gives no dose, so the dose rules were not applied.',
    by: 'The product name',
  },
  {
    raw: 'Cerenia 16mg tab', qty: 3, unit: 800, kind: 'drug', code: 'maropitant', name: '마로피탄트', en: 'Maropitant, an antiemetic',
    dose: '1.0 mg/kg, once a day, 3 days',
    by: 'The product name',
  },
  {
    raw: 'Clavamox 62.5mg', qty: 14, unit: 1200, kind: 'drug', code: 'amoxicillin_clavulanate', name: '아목시실린/클라불란산', en: 'Amoxicillin with clavulanate, an antibiotic',
    dose: '13.2 mg/kg, twice a day, 7 days',
    by: 'The national licence register',
  },
]

export const won = (n) => `₩${n.toLocaleString('en-US')}`
export const plain = (n) => n.toLocaleString('en-US')
