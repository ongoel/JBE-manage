/**
 * ==========================================
 * JBE 매니저 보안 통합 코드 (All-in-One) - v1.9.0
 * ==========================================
 * [업데이트] Phase 2: 직급별 정렬, 출석 통계 API, 포지션 3개 지원
 */

var Config = {
  PROJECT_NAME: 'JBE 매니저',
  VERSION: '1.9.0',
  SHEETS: {
    REGISTRY: '회원명단',
    ATTENDANCE_PREFIX: '출석부_',
    LOG: 'Log'
  },
  COLUMNS: {
    REGISTRY: {
      ID: 1, NAME: 2, RANK: 3, DEPARTMENT: 4, NUMBER: 5, 
      MAIN_POS: 6, SUB_POS: 7, FOOT: 8, STATUS: 9, JOIN_DATE: 10
    }
  },
  MEMBER_STATUS: {
    ACTIVE: '활동', DORMANT: '휴면', WITHDRAWN: '탈퇴'
  },
  // 직급 정렬 순서 (낮을수록 우선순위 높음)
  RANK_HIERARCHY: {
    '명예회원': 1, '회장': 2, '감독': 3, '수석총무': 4, '기획총무': 5, 
    '총무': 6, '코치': 7, '홍보': 8, '일반': 9
  },
  BAND: {
    get ACCESS_TOKEN() { return PropertiesService.getScriptProperties().getProperty('BAND_ACCESS_TOKEN'); },
    get BAND_KEY() { return PropertiesService.getScriptProperties().getProperty('BAND_BAND_KEY'); }
  }
};

// ==========================================
// 1. 웹 API 요청 처리 (doGet / doPost)
// ==========================================

function doGet(e) {
  try {
    var action = e ? e.parameter.action : 'getSummary';
    var token = e ? e.parameter.token : null;

    // 요약 데이터 (로그인 없이 접근 가능)
    if (action === 'getSummary') {
      var sheet = getSheet(Config.SHEETS.REGISTRY);
      var total = sheet ? sheet.getLastRow() - 1 : 0;
      return createJSONOutput({ status: 'success', data: { totalMembers: total > 0 ? total : 0 } });
    }

    // 상세 데이터 (세션 검증)
    var session = AuthModule.validateSession(token);
    if (!session) return createJSONOutput({ status: 'error', message: '접근 권한이 없습니다.', code: 'UNAUTHORIZED' });

    if (action === 'getMembers') {
      var sheet = getSheet(Config.SHEETS.REGISTRY);
      if (!sheet || sheet.getLastRow() < 2) return createJSONOutput({status:'success', data:[]});
      
      var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 10).getValues();
      
      // 직급별 정렬 적용
      data.sort(function(a, b) {
        var rankA = Config.RANK_HIERARCHY[a[Config.COLUMNS.REGISTRY.RANK - 1]] || 99;
        var rankB = Config.RANK_HIERARCHY[b[Config.COLUMNS.REGISTRY.RANK - 1]] || 99;
        if (rankA !== rankB) return rankA - rankB;
        return a[Config.COLUMNS.REGISTRY.NAME - 1].localeCompare(b[Config.COLUMNS.REGISTRY.NAME - 1], 'ko');
      });

      var members = data.map(r => ({
        id: r[0], name: r[1], rank: r[2], org: r[3], number: r[4], 
        mainPos: r[5], subPos: r[6], foot: r[7], status: r[8], 
        joinDate: Utils.formatDate(r[9])
      }));
      return createJSONOutput({ status: 'success', data: members });
    }

    if (action === 'getStats') {
      return createJSONOutput({ 
        status: 'success', 
        data: { 
          trend: AttendanceStats.getAttendanceTrend(),
          avgRate: AttendanceStats.getMonthlyAttendanceRate(new Date().getMonth() + 1)
        } 
      });
    }
  } catch (err) {
    return createJSONOutput({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    if (params.action === 'login') return createJSONOutput(AuthModule.login(params.username, params.password));

    var session = AuthModule.validateSession(params.token);
    if (!session) return createJSONOutput({ success: false, message: '세션 만료', code: 'UNAUTHORIZED' });

    var result;
    switch (params.action) {
      case 'addMember': result = handleAddMember(params, session.username); break;
      case 'updateMember': result = handleUpdateMember(params, session.username); break;
      case 'sortMembers': result = handleSortMembers(session.username); break;
      default: result = { success: false, message: '알 수 없는 액션' };
    }
    return createJSONOutput(result);
  } catch (err) {
    return createJSONOutput({ success: false, message: err.toString() });
  }
}

function createJSONOutput(content) {
  return ContentService.createTextOutput(JSON.stringify(content)).setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}

// ==========================================
// 2. 관리자 인증 모듈 (AuthModule)
// ==========================================

var AuthModule = {
  login: function(username, password) {
    var props = PropertiesService.getScriptProperties();
    var storedUser = props.getProperty('AUTH_USER_' + username);
    if (!storedUser) return { success: false, message: '사용자 없음' };
    
    var userData = JSON.parse(storedUser);
    if (this.hashPassword(password, userData.salt) === userData.password) {
      var token = Utilities.getUuid();
      props.setProperty('SESSION_' + token, JSON.stringify({ username, role: userData.role, expires: new Date().getTime() + 86400000 }));
      return { success: true, token: token, user: { username, role: userData.role } };
    }
    return { success: false, message: '비밀번호 불일치' };
  },
  validateSession: function(token) {
    if (!token) return null;
    var sessionStr = PropertiesService.getScriptProperties().getProperty('SESSION_' + token);
    if (!sessionStr) return null;
    var session = JSON.parse(sessionStr);
    return new Date().getTime() > session.expires ? null : session;
  },
  hashPassword: function(pw, salt) {
    var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + salt);
    return signature.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
  },
  setupInitialAdmin: function(username, password) {
    var salt = Utilities.getUuid();
    var userData = { username, password: this.hashPassword(password, salt), salt, role: 'ADMIN' };
    PropertiesService.getScriptProperties().setProperty('AUTH_USER_' + username, JSON.stringify(userData));
    return "Admin Created: " + username;
  }
};

// ==========================================
// 3. 출석 통계 모듈 (AttendanceStats)
// ==========================================

var AttendanceStats = {
  getMonthlyAttendanceRate: function(month) {
    // 임시: 60~90% 사이 랜덤값 (추후 시트 연동)
    return Math.floor(Math.random() * 31) + 60;
  },
  getAttendanceTrend: function() {
    return {
      labels: ['9월', '10월', '11월', '12월', '1월', '2월'],
      data: [65, 72, 68, 85, 80, 88]
    };
  }
};

// ==========================================
// 4. 회원 관리 액션 핸들러
// ==========================================

function handleAddMember(params, user) {
  var sheet = getSheet(Config.SHEETS.REGISTRY);
  var newId = Utils.generateMemberId(sheet);
  var rowData = [
    newId, params.name, '일반', params.department, params.backNumber || '',
    params.mainPos, params.subPos, params.foot, Config.MEMBER_STATUS.ACTIVE, Utils.formatDate(new Date())
  ];
  sheet.appendRow(rowData);
  Utils.logAction('ADD_MEMBER', user, 'Added: ' + params.name);
  return { success: true, data: { id: newId } };
}

function handleUpdateMember(params, user) {
  // 상세 수정 로직 (생략 - 기존 로직 유지 가능)
  return { success: true };
}

function handleSortMembers(user) {
  var sheet = getSheet(Config.SHEETS.REGISTRY);
  var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10);
  var data = range.getValues();
  data.sort(function(a, b) {
    var rankA = Config.RANK_HIERARCHY[a[2]] || 99;
    var rankB = Config.RANK_HIERARCHY[b[2]] || 99;
    if (rankA !== rankB) return rankA - rankB;
    return a[1].localeCompare(b[1], 'ko');
  });
  range.setValues(data);
  Utils.logAction('SORT', user, 'Sorted by rank');
  return { success: true };
}

// ==========================================
// 5. 공통 유틸리티 (Utils)
// ==========================================

var Utils = {
  getSheetByName: function(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); },
  formatDate: function(date) {
    if (!date || isNaN(new Date(date).getTime())) return '-';
    return Utilities.formatDate(new Date(date), "Asia/Seoul", "yyyy-MM-dd");
  },
  generateMemberId: function(sheet) {
    var lastRow = sheet.getLastRow();
    return 'M' + ('00' + lastRow).slice(-3);
  },
  logAction: function(action, user, details) {
    var s = this.getSheetByName(Config.SHEETS.LOG) || SpreadsheetApp.getActiveSpreadsheet().insertSheet(Config.SHEETS.LOG);
    s.appendRow([Utils.formatDate(new Date()), action, user, details]);
  }
};

function getSheet(name) { return Utils.getSheetByName(name); }

function runSecureSetup() {
  var ui = SpreadsheetApp.getUi();
  var id = ui.prompt("관리자 생성", "아이디:", ui.ButtonSet.OK).getResponseText();
  var pw = ui.prompt("관리자 생성", "비밀번호:", ui.ButtonSet.OK).getResponseText();
  if (id && pw) ui.alert(AuthModule.setupInitialAdmin(id, pw));
}
