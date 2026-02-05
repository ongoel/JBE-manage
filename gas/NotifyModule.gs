/**
 * 알림(밴드) 모듈
 * 밴드 API를 이용한 자동 포스팅 기능
 */

var NotifyModule = {
  /**
   * 네이버 밴드에 새로운 게시글을 작성합니다.
   * @param {string} content 게시할 내용 (마크다운은 지원하지 않으며, 일반 텍스트)
   * @returns {boolean} 성공 여부
   */
  writePost: function(content) {
    try {
      var accessToken = Config.BAND.ACCESS_TOKEN;
      var bandKey = Config.BAND.BAND_KEY;

      if (accessToken === 'YOUR_ACCESS_TOKEN' || bandKey === 'YOUR_BAND_KEY') {
        console.warn('밴드 API 설정이 완료되지 않았습니다. Config.gs를 확인해주세요.');
        return false;
      }

      var url = 'https://openapi.band.us/v2/band/post/create';
      var payload = {
        'access_token': accessToken,
        'band_key': bandKey,
        'content': content,
        'do_push': 'true' // 멤버들에게 푸시 알림 전송
      };

      var options = {
        'method': 'post',
        'contentType': 'application/x-www-form-urlencoded',
        'payload': payload,
        'muteHttpExceptions': true
      };

      var response = UrlFetchApp.fetch(url, options);
      var responseCode = response.getResponseCode();
      var responseBody = JSON.parse(response.getContentText());

      if (responseCode === 200 && responseBody.result_code === 1) {
        console.log('밴드 포스팅 성공');
        return true;
      } else {
        console.error('밴드 포스팅 실패: ' + response.getContentText());
        return false;
      }

    } catch (error) {
      console.error('writePost 에러: ' + error.toString());
      return false;
    }
  },

  /**
   * 경기 명단과 시간/장소 정보를 포맷팅하여 밴드에 게시합니다.
   * @param {string} gameInfo 경기 정보 (시간, 장소 등)
   * @param {string} teamList 팀 배정 결과 텍스트
   */
  postGameNotice: function(gameInfo, teamList) {
    var message = '📢 이번 주 경기 안내\n\n' +
                  '📍 경기 정보: ' + gameInfo + '\n\n' +
                  teamList + '\n\n' +
                  '모두 늦지 않게 참석 부탁드립니다! ⚽️';
    
    return this.writePost(message);
  }
};

/**
 * 전역 영역에서 호출하기 위한 래퍼 함수 (필요 시)
 */
function testBandPost() {
  NotifyModule.writePost('테스트 게시글입니다. JBE 매니저 시스템 작동 확인 중.');
}
