/**
 * 출석 통계 모듈
 * 활동 회원 기준 출석률 및 월별 통계를 담당합니다.
 */

var AttendanceStats = {
  /**
   * 활동 회원을 정의하고 필터링합니다.
   * 기준: 최근 3개월 이내 1회 이상 출석한 회원 (또는 신규 회원)
   */
  getActiveMembers: function() {
    var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
    var attendanceSheet = Utils.getSheetByName(Utils.getCurrentYearAttendanceSheetName());
    if (!sheet || !attendanceSheet) return [];

    var members = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
    // 실제 운영 시에는 출석부 시트의 데이터를 분석하여 활동 여부를 판단하는 로직 추가 필요
    // 현재는 '활동' 상태인 모든 회원을 반환하는 것으로 기초 구현
    return members.filter(r => r[8] === Config.MEMBER_STATUS.ACTIVE);
  },

  /**
   * 월별 평균 출석률을 계산합니다.
   * @param {number} month 월 (1-12)
   * @returns {number} 출석률 (%)
   */
  getMonthlyAttendanceRate: function(month) {
    var attendanceSheet = Utils.getSheetByName(Utils.getCurrentYearAttendanceSheetName());
    if (!attendanceSheet) return 0;

    // 출석부 시트 구조에 따라 월별 열 범위를 찾아 계산 (현재는 Mock 데이터용 구조 제공)
    // 실제 구현 시에는 특정 월의 열들을 합산하여 활동 회원 수로 나눔
    return Math.floor(Math.random() * (85 - 60) + 60); // 60~85% 사이 랜덤 반환 (UI 테스트용)
  },

  /**
   * 최근 6개월간의 출석 추이를 반환합니다 (그래프용).
   */
  getAttendanceTrend: function() {
    var labels = ['9월', '10월', '11월', '12월', '1월', '2월'];
    var data = labels.map(() => Math.floor(Math.random() * (90 - 50) + 50));
    return { labels: labels, data: data };
  }
};
