// Google Apps Script Web App URL
// 배포 후 생성된 URL을 여기에 입력하세요.
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxDXCHn6sityjqJbUdi4EhWfzA1yjAhjl-xgBBti7d6iMW_wb1zlVTJG1iK0d9TKB_Vgw/exec';

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    fetchSummary();
});

let sessionToken = localStorage.getItem('sessionToken');

function initAuth() {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (sessionToken) {
        showMemberSection();
        fetchMembers();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username, password })
        });
        const result = await response.json();

        if (result.success) {
            sessionToken = result.token;
            localStorage.setItem('sessionToken', sessionToken);
            showMemberSection();
            fetchMembers();
        } else {
            alert('로그인 실패: ' + result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
    }
}

function handleLogout() {
    localStorage.removeItem('sessionToken');
    sessionToken = null;
    hideMemberSection();
}

function showMemberSection() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('member-section').style.display = 'block';
}

function hideMemberSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('member-section').style.display = 'none';
}

async function fetchSummary() {
    try {
        const response = await fetch(`${GAS_API_URL}?action=getSummary`);
        const json = await response.json();
        if (json.status === 'success') {
            document.getElementById('total-members').textContent = json.data.totalMembers + '명';
        }
    } catch (error) {
        console.error('Error fetching summary:', error);
    }
}

async function fetchMembers() {
    const tableBody = document.querySelector('#members-table tbody');
    tableBody.innerHTML = '<tr><td colspan="4" class="loading">데이터를 불러오는 중...</td></tr>';

    try {
        const response = await fetch(`${GAS_API_URL}?action=getMembers&token=${sessionToken}`);
        const json = await response.json();

        if (json.status === 'success') {
            renderMembers(json.data);
        } else if (json.code === 'UNAUTHORIZED') {
            handleLogout();
        } else {
            throw new Error(json.message);
        }
    } catch (error) {
        console.error('Error fetching members:', error);
        tableBody.innerHTML = `<tr><td colspan="4" class="loading" style="color: red;">오류: ${error.message}</td></tr>`;
    }
}

function renderMembers(members) {
    const tableBody = document.querySelector('#members-table tbody');
    tableBody.innerHTML = '';

    members.forEach(member => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold;">${member.name}</td>
            <td>${member.number || '-'}</td>
            <td>${member.mainPos || '-'}</td>
            <td><span class="status-badge status-${getStatusClass(member.status)}">${member.status}</span></td>
        `;
        tableBody.appendChild(tr);
    });
}

function getStatusClass(status) {
    if (status === '활동') return 'active';
    if (status === '휴면') return 'dormant';
    if (status === '탈퇴') return 'withdrawn';
    return 'unknown';
}
