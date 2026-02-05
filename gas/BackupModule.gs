/**
 * 백업 및 복구 모듈
 * 데이터 손실 방지를 위한 시트 스냅샷 기능 제공
 */

var BackupModule = {
  /**
   * 특정 시트의 스냅샷(백업)을 생성합니다.
   * 원본 시트를 복제하여 '원본명_Backup_YYYYMMDD_HHmmss' 형식으로 저장합니다.
   * @param {string} sheetName 백업할 시트 이름
   * @returns {string|null} 생성된 백업 시트 이름 또는 실패 시 null
   */
  snapshotSheet: function(sheetName) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);

      if (!sheet) {
        console.error('백업 실패: 시트를 찾을 수 없습니다 (' + sheetName + ')');
        return null;
      }

      var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
      var backupName = sheetName + '_Backup_' + timestamp;

      // 시트 복제
      var backupSheet = sheet.copyTo(ss);
      backupSheet.setName(backupName);

      // 백업 시트는 탭 색상을 회색으로 변경하여 구분
      backupSheet.setTabColor('#808080');

      console.log('백업 생성 완료: ' + backupName);
      return backupName;

    } catch (error) {
      console.error('snapshotSheet 에러: ' + error.toString());
      return null;
    }
  }
};
