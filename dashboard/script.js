// Google Apps Script Web App URL
// 배포 후 생성된 URL을 여기에 입력하세요.
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxDXCHn6sityjqJbUdi4EhWfzA1yjAhjl-xgBBti7d6iMW_wb1zlVTJG1iK0d9TKB_Vgw/exec';

document.addEventListener('DOMContentLoaded', () => {
    fetchMembers();
});

async function fetchMembers() {
    const tableBody = document.querySelector('#members-table tbody');

    try {
        let members = [];

        if (!GAS_API_URL) {
            console.warn('GAS_API_URL is not set. Using mock data.');
            // Mock data for demonstration/local testing
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));
            members = getMockMembers();
        } else {
            const response = await fetch(`${GAS_API_URL}?action=getMembers`);
            const json = await response.json();

            if (json.status === 'success') {
                members = json.data;
            } else {
                throw new Error(json.message || 'Failed to fetch members');
            }
        }

        renderMembers(members);
        updateSummary(members);

    } catch (error) {
        console.error('Error fetching members:', error);
        tableBody.innerHTML = `<tr><td colspan="9" class="loading" style="color: red;">데이터를 불러오는 중 오류가 발생했습니다: ${error.message}</td></tr>`;
    }
}

function renderMembers(members) {
    const tableBody = document.querySelector('#members-table tbody');
    tableBody.innerHTML = '';

    if (members.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="loading">등록된 회원이 없습니다.</td></tr>';
        return;
    }

    members.forEach(member => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${member.id}</td>
            <td>${member.name}</td>
            <td>${member.department}</td>
            <td>${member.number || '-'}</td>
            <td>${member.mainPos || '-'}</td>
            <td>${member.subPos || '-'}</td>
            <td>${member.foot || '-'}</td>
            <td>${member.status}</td>
            <td>${member.joinDate}</td>
        `;
        tableBody.appendChild(tr);
    });
}

function updateSummary(members) {
    const totalMembersElement = document.getElementById('total-members');
    if (totalMembersElement) {
        totalMembersElement.textContent = members.length + '명';
    }

    // Attendance logic would go here if we had attendance data
    // For now, leave it as '-' or mock it
}

function getMockMembers() {
    return [
        {
            id: 'M001',
            name: '홍길동',
            department: '개발팀',
            number: 10,
            mainPos: 'FW',
            subPos: 'MF',
            foot: 'R',
            status: '활동',
            joinDate: '2023-01-01'
        },
        {
            id: 'M002',
            name: '김철수',
            department: '기획팀',
            number: 7,
            mainPos: 'MF',
            subPos: 'DF',
            foot: 'L',
            status: '활동',
            joinDate: '2023-02-15'
        },
        {
            id: 'M003',
            name: '이영희',
            department: '디자인팀',
            number: 1,
            mainPos: 'GK',
            subPos: '-',
            foot: 'R',
            status: '휴면',
            joinDate: '2023-03-10'
        },
        {
            id: 'M004',
            name: '박민수',
            department: '인사팀',
            number: 14,
            mainPos: 'DF',
            subPos: 'MF',
            foot: 'L',
            status: '활동',
            joinDate: '2023-05-20'
        }
    ];
}
