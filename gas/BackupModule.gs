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
  },

  /**
   * 매일 전체 시트를 백업합니다 (시간 기반 트리거용).
   */
  dailyBackup: function() {
    var sheetsToBackup = [Config.SHEETS.REGISTRY, Utils.getCurrentYearAttendanceSheetName()];
    var results = [];
    
    sheetsToBackup.forEach(function(name) {
      var result = BackupModule.snapshotSheet(name);
      if (result) results.push(result);
    });

    this.recordRollbackPoint('Daily Auto Backup: ' + results.join(', '));
    Utils.logAction('DAILY_BACKUP', 'SYSTEM', 'Performed daily backup for: ' + results.join(', '));
  },

  /**
   * 현재 시점의 스프레드시트 상태를 롤백 포인트로 기록합니다.
   * @param {string} note 기록용 메모
   */
  recordRollbackPoint: function(note) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var rollbackSheetName = 'RollbackHistory';
    var sheet = ss.getSheetByName(rollbackSheetName);

    if (!sheet) {
      sheet = ss.insertSheet(rollbackSheetName);
      sheet.appendRow(['Timestamp', 'User', 'Note', 'SheetSnapshots']);
      sheet.setFrozenRows(1);
    }

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([timestamp, Session.getActiveUser().getEmail(), note || 'Manual Snap', '']);
  },

  /**
   * 특정 시점의 시트 복구 (수동 호출 권장)
   * @param {string} backupSheetName 복구할 백업 시트 이름
   * @param {string} targetSheetName 원본으로 복구할 대상 시트 이름
   */
  restoreSheet: function(backupSheetName, targetSheetName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backupSheet = ss.getSheetByName(backupSheetName);
    var targetSheet = ss.getSheetByName(targetSheetName);

    if (!backupSheet) throw new Error('백업 시트를 찾을 수 없습니다.');
    
    // 기존 시트 이름 변경 (안전장치)
    if (targetSheet) {
      targetSheet.setName(targetSheetName + '_Old_' + new Date().getTime());
    }

    var restored = backupSheet.copyTo(ss);
    restored.setName(targetSheetName);
    restored.setTabColor(null); // 색상 초기화
    
    console.log(targetSheetName + ' 시트가 ' + backupSheetName + ' 로부터 복구되었습니다.');
  }
};
