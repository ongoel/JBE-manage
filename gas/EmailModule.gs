/**
 * 이메일 알림 모듈
 * 시스템 오류 발생 시 관리자에게 이메일을 발송합니다.
 */

var EmailModule = {
  /**
   * 에러 상세 내용을 관리자에게 이메일로 발송합니다.
   * @param {Error} error 발생한 에러 객체
   * @param {string} functionName 에러가 발생한 함수명
   */
  sendErrorAlert: function(error, functionName) {
    try {
      var recipient = Session.getEffectiveUser().getEmail(); // 현재 관리자의 이메일
      var subject = '⚠️ [' + Config.PROJECT_NAME + '] 시스템 오류 발생 (' + functionName + ')';
      
      var body = 'JBE 매니저 시스템에서 오류가 감지되었습니다.\n\n' +
                 '--------------------------------------------------\n' +
                 '📍 발생 위치: ' + functionName + '\n' +
                 '🛑 에러 내용: ' + error.toString() + '\n' +
                 '⏰ 발생 시간: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') + '\n' +
                 '--------------------------------------------------\n\n' +
                 '스프레드시트의 [Log] 시트에서 상세 이력을 확인하거나, ' +
                 'Apps Script 실행 로그를 점검해 보세요.';

      MailApp.sendEmail(recipient, subject, body);
      console.log('관리자에게 에러 알림 이메일을 발송했습니다: ' + recipient);
      
    } catch (e) {
      console.error('이메일 발송 실패: ' + e.toString());
    }
  },

  /**
   * 테스트 이메일을 발송합니다.
   */
  testEmail: function() {
    var testError = new Error('이것은 시스템 테스트용 에러 메시지입니다.');
    this.sendErrorAlert(testError, 'testEmail');
  }
};
