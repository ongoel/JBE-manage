<instruction>You are an expert software engineer. You are working on a WIP branch. Please run `git status` and `git diff` to understand the changes and the current state of the code. Analyze the workspace context and complete the mission brief.</instruction>
<workspace_context>
<artifacts>
--- CURRENT TASK CHECKLIST ---
- [ ] Update Implementation Plan to use GAS Web App + Cloudflare Hosting <!-- id: 0 -->
- [ ] Verify plan with user <!-- id: 1 -->

--- IMPLEMENTATION PLAN ---
# 구현 계획: JBE 매니저 관리자 대시보드 (GAS + Cloudflare)

이 계획은 관리자 대시보드를 **Google Apps Script(GAS) 웹 앱**과 **Cloudflare Pages**를 연동하여 구현하는 방안을 설명합니다.

## 목표
- 관리자가 회원 정보, 출석부 등을 웹 인터페이스에서 쉽고 빠르게 조회하고 수정할 수 있는 대시보드 구축
- **GAS Web App**을 백엔드 API로 활용하고, **Cloudflare Pages**를 프론트엔드 호스팅으로 사용하여 안정적이고 빠른 서비스 제공

## 아키텍처 개요

1.  **데이터베이스 (Database)**
    - **Google Sheets**: 모든 데이터(회원 명단, 출석 기록 등)의 원천 저장소입니다.

2.  **백엔드 (Backend & API)**
    - **Google Apps Script (GAS)**
    - **역할**: 시트 데이터의 읽기(Read) 및 쓰기(Write)를 처리하는 API 역할 수행.
    - **배포**: '웹 앱'으로 배포하여 `doGet()` 및 `doPost()` 함수를 통해 JSON 데이터를 주고받습니다.

3.  **프론트엔드 (Frontend)**
    - **기술 스택**: HTML, CSS, Vanilla JavaScript (또는 가벼운 프레임워크)
    - **호스팅**: **Cloudflare Pages** (GitHub 리포지토리와 연동하여 자동 배포)
    - **통신**: `fetch()` API를 사용하여 GAS 웹 앱 URL로 데이터를 요청하고 전송합니다.

## 사용자 검토 필요 사항 (User Review Required)
> [!IMPORTANT]
> **GAS 웹 앱 배포 권한 설정**:
> GAS 웹 앱을 배포할 때, **"Execute as: Me (나)"**, **"Who has access: Anyone (누구나)"**로 설정해야 Cloudflare에서 호스팅된 프론트엔드가 CORS 문제 없이 데이터에 접근할 수 있습니다. (보안을 위해 API 토큰 등의 간단한 인증 로직을 추가하는 것을 권장합니다.)

## 상세 변경 사항 (Proposed Changes)

### 1. Google Apps Script (GAS)
#### [MODIFY] `Code.gs` (또는 새로운 API 핸들러 파일)
- **`doGet(e)`**: 요청된 파라미터(예: `action=getMembers`)에 따라 시트 데이터를 JSON 형식으로 반환하는 로직 구현.
- **`doPost(e)`**: 클라이언트에서 보낸 데이터(예: 회원 정보 수정, 출석 체크)를 받아 시트를 업데이트하는 로직 구현.
- **CORS 처리**: 외부 도메인(Cloudflare)에서 호출 가능하도록 응답 헤더 설정 필요.

### 2. Dashboard Frontend
#### [Content] `dashboard/`
- **`index.html`**: 대시보드 메인 레이아웃 및 UI.
- **`script.js`**: GAS 웹 앱 URL로 API 요청을 보내고, 응답받은 데이터를 DOM에 렌더링하는 로직.
- **`style.css`**: 대시보드 스타일링.

### 3. Deployment Flow
- GitHub 리포지토리의 `dashboard/` 폴더를 Cloudflare Pages 프로젝트의 루트로 설정.
- GitHub에 코드를 푸시하면 Cloudflare Pages가 자동으로 빌드 및 배포.

## 검증 계획 (Verification Plan)

### 자동화 테스트 (Automated Tests)
- GAS API 엔드포인트에 대한 `curl` 또는 Postman 테스트 (JSON 응답 확인).

### 수동 검증 (Manual Verification)
1.  **읽기 테스트**: 대시보드 접속 시 회원 목록이 정상적으로 로드되는지 확인.
2.  **쓰기 테스트**: 대시보드에서 회원 정보를 수정하거나 출석을 체크한 후, 실제 구글 스프레드시트에 반영되는지 확인.
3.  **배포 테스트**: GitHub 푸시 후 Cloudflare Pages에 변경 사항이 자동 반영되는지 확인.
</artifacts>
</workspace_context>
<mission_brief>[Describe your task here...]</mission_brief>