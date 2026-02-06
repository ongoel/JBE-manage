/**
 * JBE 매니저 설정 파일
 * 모든 설정값과 상수를 이 파일에서 관리합니다.
 */

var Config = {
  // 프로젝트 기본 정보
  PROJECT_NAME: 'JBE 매니저',
  VERSION: '1.0.0',

  // 스프레드시트 시트 이름 설정
  SHEETS: {
    REGISTRY: '등록부',
    ATTENDANCE_PREFIX: '출석부_', // 뒤에 연도가 붙음 (예: 출석부_2026)
    NUMBER_STATUS: '등번호 현황',
    LOG: 'Log'
  },

  // 등록부 열 위치 (1-based index)
  COLUMNS: {
    REGISTRY: {
      ID: 1,        // A열: 회원번호
      NAME: 2,      // B열: 성명
      DEPARTMENT: 3, // C열: 소속
      NUMBER: 4,    // D열: 등번호
      MAIN_POS: 5,  // E열: 주 포지션
      SUB_POS: 6,   // F열: 선호 포지션
      FOOT: 7,      // G열: 주발
      STATUS: 8,    // H열: 상태 (활동/휴면/탈퇴)
      JOIN_DATE: 9  // I열: 가입일
    }
  },

  // 포지션 상수
  POSITIONS: {
    GK: 'GK',
    DF: 'DF',
    MF: 'MF',
    FW: 'FW'
  },

  // 회원 상태 상수
  MEMBER_STATUS: {
    ACTIVE: '활동',
    DORMANT: '휴면',
    WITHDRAWN: '탈퇴'
  },

  // 네이버 밴드 API 설정 (스크립트 속성에서 관리)
  BAND: {
    get ACCESS_TOKEN() { return PropertiesService.getScriptProperties().getProperty('BAND_ACCESS_TOKEN'); },
    get BAND_KEY() { return PropertiesService.getScriptProperties().getProperty('BAND_BAND_KEY'); }
  },

  /**
   * 보안 속성을 가져옵니다.
   * @param {string} key 속성 키
   * @returns {string} 속성 값
   */
  getSecureProperty: function(key) {
    return PropertiesService.getScriptProperties().getProperty(key);
  }
};
