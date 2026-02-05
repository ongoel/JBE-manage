/**
 * 아카이브 및 연도 전환 모듈
 * 차년도 시트 생성 및 데이터 이관 담당
 */

var ArchiveModule = {
  /**
   * 다음 연도의 출석부 시트를 자동으로 생성합니다.
   * 등록부의 활동 회원들을 새 시트로 이관합니다.
   */
  createNewYearAttendance: function(isSilent) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var nextYear = new Date().getFullYear() + 1;
      var newSheetName = Config.SHEETS.ATTENDANCE_PREFIX + nextYear;

      // 1. 이미 시트가 존재하는지 확인
      var existingSheet = ss.getSheetByName(newSheetName);
      if (existingSheet) {
        if (isSilent) {
          throw new Error(newSheetName + ' 시트가 이미 존재합니다. 작업을 중단합니다.');
        } else {
          var ui = SpreadsheetApp.getUi();
          var response = ui.alert('알림', newSheetName + ' 시트가 이미 존재합니다. 다시 생성하시겠습니까? (기존 데이터가 초기화될 수 있습니다.)', ui.ButtonSet.YES_NO);
          if (response !== ui.Button.YES) return;

          // 기존 시트 백업
          BackupModule.snapshotSheet(newSheetName);
          ss.deleteSheet(existingSheet);
        }
      }

      // 2. 새 시트 생성 및 헤더 설정
      var newSheet = ss.insertSheet(newSheetName);
      var headers = [['회원번호', '성명', '등번호', '소속', '합계']];
      newSheet.getRange(1, 1, 1, headers[0].length).setValues(headers)
              .setBackground('#CFE2F3')
              .setFontWeight('bold')
              .setHorizontalAlignment('center');

      // 3. 등록부에서 활동 회원 가져오기
      var registrySheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
      var registryData = registrySheet.getRange(2, 1, registrySheet.getLastRow() - 1, 9).getValues();
      
      var membersToMigrate = [];
      registryData.forEach(function(row) {
        // 상태가 '활동'인 회원만 이관
        if (row[7] === Config.MEMBER_STATUS.ACTIVE) {
          membersToMigrate.push([
            row[0], // ID
            row[1], // 성명
            row[3], // 등번호
            row[2], // 소속
            0       // 합계 초기값
          ]);
        }
      });

      if (membersToMigrate.length > 0) {
        newSheet.getRange(2, 1, membersToMigrate.length, 5).setValues(membersToMigrate);
        
        // 4. 서식 정리
        newSheet.setFrozenRows(1);
        newSheet.setFrozenColumns(4);
        
        // 데이터 유효성 검사 등 추가 가능
      }

      // 5. 완료 알림
      var msg = nextYear + '년도 출석부 시트가 생성되었습니다. 총 ' + membersToMigrate.length + '명이 이관되었습니다.';
      if (!isSilent) {
        SpreadsheetApp.getUi().alert('완료', msg);
      }
      console.log(newSheetName + ' 생성 및 ' + membersToMigrate.length + '명 이관 완료');

    } catch (error) {
      console.error('createNewYearAttendance 에러: ' + error.toString());
      if (!isSilent) {
        SpreadsheetApp.getUi().alert('오류 발생: ' + error.toString());
      } else {
        throw error; // Silent 모드에서는 에러를 던져서 호출자가 처리하게 함
      }
    }
  },

  /**
   * 이전 연도 시트를 아카이브(보기 전용 보호) 처리합니다.
   * @param {string} sheetName 보호할 시트 이름
   */
  protectOldSheet: function(sheetName) {
    var sheet = Utils.getSheetByName(sheetName);
    if (!sheet) return;

    var protection = sheet.protect().setDescription('이전 연도 데이터 보호');
    var me = Session.getEffectiveUser();
    protection.addEditor(me);
    protection.removeEditors(protection.getEditors());
    if (protection.canEdit()) {
      protection.setWarningOnly(true);
    }
    
    console.log(sheetName + ' 시트가 보호 처리되었습니다.');
  }
};

/**
 * 메뉴 또는 버튼에서 호출하기 위한 함수
 */
function runYearTransition() {
  ArchiveModule.createNewYearAttendance();
}
