# JBE 매니저 v1.0

축구동호회 관리 시스템 - 회원, 출석, 팀 배정 자동화

---

## 🚀 주요 기능

- **회원 관리**: 구글 폼 연동 자동 등록, 등번호 중복 체크
- **출석 관리**: 네이버 밴드 투표 텍스트 자동 파싱, 랭킹 계산
- **팀 밸런싱**: 포지션/실력 기반 2단계 최적화 알고리즘
- **밴드 연동**: 경기 명단 자동 포스팅
- **연도 전환**: 버튼 클릭으로 새해 출석부 자동 생성
- **관리자 대시보드**: Cloudflare Pages 기반 웹 대시보드

---

## 📁 프로젝트 구조

```
JBE-Manager/
├── gas/                    # Google Apps Script 코드
│   ├── Config.gs          # 설정값 관리
│   ├── Utils.gs           # 공통 유틸리티
│   ├── MemberModule.gs    # 회원 관리
│   ├── AttendanceModule.gs # 출석 관리
│   ├── TeamModule.gs      # 팀 밸런싱
│   ├── NotifyModule.gs    # 밴드 포스팅
│   ├── ArchiveModule.gs   # 연도 전환
│   ├── BackupModule.gs    # 백업 기능
│   ├── Validator.gs       # 데이터 검증
│   ├── Code.gs           # Web App API
│   └── Tests.gs          # 테스트 스크립트
├── dashboard/             # 관리자 대시보드
│   ├── index.html
│   ├── style.css
│   └── script.js
└── docs/                  # 문서
    ├── Sheet_Schema.md          # 시트 구조 정의
    ├── JBE_Manager_Manual.md    # 사용자 매뉴얼
    ├── Admin_Manual.md          # 관리자 매뉴얼
    └── Code_Review.md           # 코드 리뷰 보고서
```

---

## 🛠️ 기술 스택

- **Backend**: Google Apps Script (JavaScript)
- **Database**: Google Sheets
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Hosting**: Cloudflare Pages
- **Version Control**: GitHub
- **API**: Naver Band API

---

## 📚 문서

- [사용자 매뉴얼](./docs/JBE_Manager_Manual.md) - 일반 회원 및 운영자용
- [관리자 매뉴얼](./docs/Admin_Manual.md) - 시스템 관리자용
- [코드 리뷰 보고서](./docs/Code_Review.md) - 품질 검토 결과
- [시트 스키마](./docs/Sheet_Schema.md) - 데이터 구조 정의
- [배포 체크리스트](./DEPLOYMENT_CHECKLIST.md) - 최종 배포 확인사항

---

## 🚀 배포 상태

| 항목 | 상태 | URL |
|------|:----:|-----|
| GAS Web App | ✅ 배포 완료 | (관리자 확인) |
| 대시보드 | ✅ 배포 완료 | https://jbe-manage.pages.dev |
| 스프레드시트 | ✅ 운영 중 | (비공개) |

---

## ⚙️ 설치 및 설정

### 1. GAS 트리거 설정
```javascript
// Apps Script에서 실행
function setupTriggers() {
  // 기존 트리거 삭제 후 재생성
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit().create();
    
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit().create();
}
```

### 2. 밴드 API 토큰 설정
`gas/Config.gs` 파일의 `BAND` 객체에 실제 토큰 입력:
```javascript
BAND: {
  ACCESS_TOKEN: '실제_액세스_토큰',
  BAND_KEY: '실제_밴드_키'
}
```

### 3. 테스트 실행
```javascript
// Apps Script에서 실행
runAllTests();
```

---

## 📈 프로젝트 상태

- **버전**: v1.0
- **개발 기간**: 2주
- **코드 품질**: A+ (8.3/10)
- **테스트 커버리지**: 17개 단위 테스트
- **완료율**: Phase 1~7 완료 (100%)

---

## 🤝 기여

JBE Manager Dev Team

---

## 📄 라이선스

Private - JBE 축구동호회 전용
