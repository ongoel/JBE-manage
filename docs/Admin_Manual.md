# JBE 매니저 관리자 매뉴얼

## 📌 관리자 전용 고급 기능 가이드

이 문서는 JBE 매니저 시스템의 관리자를 위한 상세 매뉴얼입니다.

---

## 🛠️ 1. GAS(Google Apps Script) 관리

### 1.1 스크립트 편집기 접근
1. 구글 스프레드시트 상단 메뉴: **[확장 프로그램] > [Apps Script]**
2. 좌측 파일 목록에서 각 모듈 확인 가능

### 1.2 주요 모듈 설명

| 파일명 | 역할 | 주요 함수 |
|--------|------|-----------|
| `Config.gs` | 설정값 중앙 관리 | - |
| `Utils.gs` | 공통 유틸리티 | `getSheetByName()`, `generateMemberId()`, `logAction()` |
| `MemberModule.gs` | 회원 관리 | `onFormSubmit()`, `onEdit()` |
| `AttendanceModule.gs` | 출석 관리 | `parseAttendanceFromBand()`, `markAttendance()` |
| `TeamModule.gs` | 팀 밸런싱 | `balanceTeams()` |
| `NotifyModule.gs` | 밴드 포스팅 | `writePost()`, `postGameNotice()` |
| `ArchiveModule.gs` | 연도 전환 | `createNewYearAttendance()` |
| `Code.gs` | Web App 진입점 | `doGet()`, `doPost()` |
| `Tests.gs` | 테스트 스크립트 | `runAllTests()` |

---

## 🔧 2. 트리거(Trigger) 설정

### 2.1 자동 트리거 확인
1. Apps Script 편집기에서 좌측 **시계 아이콘(⏰)** 클릭
2. 현재 설정된 트리거 목록 확인

### 2.2 필수 트리거 목록
| 함수명 | 트리거 유형 | 설명 |
|--------|------------|------|
| `onFormSubmit` | 폼 제출 시 | 신규 회원 등록 시 자동 실행 |
| `onEdit` | 시트 수정 시 | 회원 정보 수정 시 출석부 동기화 |

### 2.3 트리거 재설정 방법
```javascript
// Apps Script에서 실행
function setupTriggers() {
  // 기존 트리거 삭제
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // 폼 제출 트리거 생성
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
    
  // 시트 편집 트리거 생성
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
    
  console.log('트리거 설정 완료');
}
```

---

## 📊 3. 테스트 실행

### 3.1 전체 시스템 테스트
```javascript
// Apps Script에서 실행
function runAllTests() {
  // 자동 실행됨
}
```
- 실행 후 로그(Ctrl+Enter) 확인
- 통과/실패 개수 확인

### 3.2 개별 기능 테스트
- `testMemberRegistration()`: 회원 등록 시뮬레이션
- `testAttendanceMarking()`: 출석 체크 시뮬레이션
- `testTeamBalancing()`: 팀 배정 시뮬레이션

---

## 🌐 4. 밴드 API 설정

### 4.1 토큰 발급받기
1. [네이버 밴드 개발자 센터](https://developers.band.us/) 접속
2. 앱 등록 후 Access Token 발급
3. 밴드 설정에서 Band Key 확인

### 4.2 Config.gs에 토큰 입력
```javascript
BAND: {
  ACCESS_TOKEN: 'AAFkL...실제토큰입력',
  BAND_KEY: 'AAFB...실제키입력'
}
```

### 4.3 테스트 포스팅
```javascript
function testBandPost() {
  NotifyModule.writePost('테스트 게시글입니다.');
}
```

---

## 📅 5. 연도 전환 작업

### 5.1 실행 시기
- 매년 12월 말~1월 초

### 5.2 실행 방법
```javascript
function runYearTransition() {
  ArchiveModule.createNewYearAttendance();
}
```

### 5.3 작업 내용
1. 기존 출석부 자동 백업
2. 새해 출석부 시트 생성 (`출석부_2027` 등)
3. '활동' 상태 회원만 새 시트로 이관

---

## 🔍 6. 로그 및 디버깅

### 6.1 로그 시트 확인
- 시트 이름: `Log`
- 모든 작업 이력이 타임스탬프와 함께 기록됨

### 6.2 스크립트 실행 로그
1. Apps Script 편집기 > **실행로그** 탭
2. `console.log()` 출력 내용 확인

### 6.3 오류 발생 시 대처
1. 오류 메시지 전체 복사
2. 해당 모듈의 코드 확인
3. 필요 시 백업 시트에서 데이터 복구

---

## 🔐 7. 보안 및 권한 관리

### 7.1 스프레드시트 공유 설정
- **편집 권한**: 관리자만
- **보기 권한**: 필요 시 회원에게 부여
- **대시보드**: 누구나 열람 가능 (읽기 전용)

### 7.2 GAS Web App 배포 권한
- **실행 권한**: 나(관리자)
- **액세스 권한**: 모든 사람 (익명 포함)

---

## 📈 8. 성능 최적화 팁

### 8.1 대량 데이터 처리 시
- 반복문 내에서 `getRange()`를 여러 번 호출하지 말 것
- `getValues()`로 한 번에 데이터를 가져온 후 메모리에서 처리

### 8.2 실행 시간 제한
- GAS는 최대 6분 실행 제한
- 대량 작업은 여러 함수로 나누어 실행

---

## 🆘 9. 문제 해결 (Troubleshooting)

### Q1. 트리거가 작동하지 않아요
- Apps Script 편집기 > 트리거(⏰) 탭 확인
- `setupTriggers()` 함수 재실행

### Q2. 밴드 포스팅이 실패해요
- Config.gs의 토큰/키 확인
- 밴드 개발자 센터에서 토큰 유효성 확인
- 밴드 멤버 권한 확인

### Q3. 대시보드가 업데이트되지 않아요
- GAS Web App 재배포 필요
  1. Apps Script > 배포 > 배포 관리
  2. 새 배포 만들기
  3. 새 URL을 `script.js`의 `GAS_API_URL`에 업데이트

---

## 📞 10. 지원 및 문의

기술 문제 발생 시:
1. `Log` 시트 확인
2. Apps Script 실행 로그 확인
3. 오류 메시지와 함께 개발자에게 문의

---

**문서 버전**: v1.0
**최종 업데이트**: 2026-02-05
