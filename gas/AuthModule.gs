/**
 * 인증 및 권한 관리 모듈
 * 관리자 로그인, 세션 관리, 비밀번호 보안을 담당합니다.
 */

var AuthModule = {
  /**
   * 사용자 로그인을 시도합니다.
   * @param {string} username 아이디
   * @param {string} password 비밀번호 (평문)
   * @returns {Object} {success: boolean, token: string, user: Object}
   */
  login: function(username, password) {
    try {
      var props = PropertiesService.getScriptProperties();
      var storedUser = props.getProperty('AUTH_USER_' + username);
      
      if (!storedUser) return { success: false, message: '사용자를 찾을 수 없습니다.' };
      
      var userData = JSON.parse(storedUser);
      var hashedPassword = this.hashPassword(password, userData.salt);
      
      if (hashedPassword === userData.password) {
        var token = Utilities.getUuid();
        var session = {
          username: username,
          role: userData.role,
          expires: new Date().getTime() + (1000 * 60 * 60 * 24) // 24시간
        };
        props.setProperty('SESSION_' + token, JSON.stringify(session));
        
        return { 
          success: true, 
          token: token, 
          user: { username: username, role: userData.role } 
        };
      }
      
      return { success: false, message: '비밀번호가 일치하지 않습니다.' };
      
    } catch (e) {
      console.error('Login error: ' + e.toString());
      return { success: false, message: '로그인 도중 오류가 발생했습니다.' };
    }
  },

  /**
   * 세션 토큰의 유효성을 검사합니다.
   * @param {string} token 세션 토큰
   * @returns {Object|null} 세션 정보 또는 null
   */
  validateSession: function(token) {
    if (!token) return null;
    var props = PropertiesService.getScriptProperties();
    var sessionStr = props.getProperty('SESSION_' + token);
    if (!sessionStr) return null;
    
    var session = JSON.parse(sessionStr);
    if (new Date().getTime() > session.expires) {
      props.deleteProperty('SESSION_' + token);
      return null;
    }
    return session;
  },

  /**
   * 비밀번호를 해싱합니다.
   * @param {string} password 평문 비밀번호
   * @param {string} salt 솔트값
   * @returns {string} 해싱된 비밀번호
   */
  hashPassword: function(password, salt) {
    var raw = password + salt;
    var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
    var hexString = '';
    for (var i = 0; i < signature.length; i++) {
        var byte = signature[i];
        if (byte < 0) byte += 256;
        var byteStr = byte.toString(16);
        if (byteStr.length == 1) byteStr = '0' + byteStr;
        hexString += byteStr;
    }
    return hexString;
  },

  /**
   * 초기 관리자 계정을 생성합니다. (보안상의 이유로 수동 혹은 최초 1회만 호출 권장)
   * @param {string} username 아이디
   * @param {string} password 비밀번호
   */
  setupInitialAdmin: function(username, password) {
    var salt = Utilities.getUuid();
    var hashedPassword = this.hashPassword(password, salt);
    var userData = {
      username: username,
      password: hashedPassword,
      salt: salt,
      role: 'ADMIN' // Level 1
    };
    
    PropertiesService.getScriptProperties().setProperty('AUTH_USER_' + username, JSON.stringify(userData));
    console.log('Admin account created: ' + username);
  },

  /**
   * 사용자의 권한 레벨을 업데이트합니다.
   */
  updatePermission: function(username, newRole) {
    var props = PropertiesService.getScriptProperties();
    var storedUser = props.getProperty('AUTH_USER_' + username);
    if (!storedUser) return false;
    
    var userData = JSON.parse(storedUser);
    userData.role = newRole;
    props.setProperty('AUTH_USER_' + username, JSON.stringify(userData));
    return true;
  }
};
