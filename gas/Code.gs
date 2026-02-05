/**
 * JBE 매니저 웹 앱 진입점 (GAS Web App)
 *
 * GET 요청 처리: 회원 목록 조회 등
 * POST 요청 처리: 회원 정보 수정 등
 */

/**
 * GET 요청 처리
 * @param {Object} e 이벤트 객체
 * @returns {ContentService.TextOutput} JSON 응답
 */
function doGet(e) {
  var action = e.parameter.action || 'getMembers';
  var result = {};

  try {
    if (action === 'getMembers') {
      // 실제 시트 연동 대신 Mock 데이터 반환
      result = {
        status: 'success',
        data: getMockMembers()
      };
    } else {
      result = {
        status: 'error',
        message: 'Unknown action: ' + action
      };
    }
  } catch (error) {
    result = {
      status: 'error',
      message: error.toString()
    };
  }

  return createJSONOutput(result);
}

/**
 * POST 요청 처리
 * @param {Object} e 이벤트 객체
 * @returns {ContentService.TextOutput} JSON 응답
 */
function doPost(e) {
  var action = e.parameter.action;
  var result = {};

  try {
    // POST 데이터 파싱
    var postData = JSON.parse(e.postData.contents);

    if (action === 'updateMember') {
      // 실제 업데이트 로직 대신 성공 응답 반환
      // var memberId = postData.id;
      // var updates = postData.updates;

      result = {
        status: 'success',
        message: 'Member updated successfully (Mock)',
        data: postData
      };
    } else {
      result = {
        status: 'error',
        message: 'Unknown action: ' + action
      };
    }
  } catch (error) {
    result = {
      status: 'error',
      message: error.toString()
    };
  }

  return createJSONOutput(result);
}

/**
 * JSON 응답 생성 (CORS 헤더 포함)
 * @param {Object} content 응답 데이터
 * @returns {ContentService.TextOutput}
 */
function createJSONOutput(content) {
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Mock 회원 데이터 생성
 * @returns {Array} 회원 객체 배열
 */
function getMockMembers() {
  return [
    {
      id: 'M001',
      name: '홍길동',
      department: '개발팀',
      number: 10,
      mainPos: 'FW',
      subPos: 'MF',
      foot: 'R',
      status: '활동',
      joinDate: '2023-01-01'
    },
    {
      id: 'M002',
      name: '김철수',
      department: '기획팀',
      number: 7,
      mainPos: 'MF',
      subPos: 'DF',
      foot: 'L',
      status: '활동',
      joinDate: '2023-02-15'
    },
    {
      id: 'M003',
      name: '이영희',
      department: '디자인팀',
      number: 1,
      mainPos: 'GK',
      subPos: '-',
      foot: 'R',
      status: '휴면',
      joinDate: '2023-03-10'
    }
  ];
}
