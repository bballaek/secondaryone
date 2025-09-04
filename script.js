// ==== CONFIG ====
const CONFIG = {
    apiKey: 'AIzaSyD0vZQpRQnqvNXHasFDCvba2tu3-KpXhMw',
    files: {
        folderId: '1bD3EsRjLWTPeLzutc3iyW6iu0BLwxrz3', // Google Drive Folder ID
    },
    schedule: {
        sheetId: '1tEa7EE8xi1_vSBtWEZkwWwyPZbvxv0xjX-Z5oktWFNE',
        sheetName: 'schedule'
    }
};

let allFiles = [];
let scheduleData = [];

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'files' && allFiles.length === 0) {
        loadFilesData();
    } else if (tabName === 'schedule' && scheduleData.length === 0) {
        loadScheduleData();
    }
}

// Google Drive helper
function convertToGoogleDriveDownloadLink(fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Extract metadata from filename
function parseFileNameMetadata(fileName) {
    const nameParts = fileName.split('_');
    let subject = 'ไม่ระบุ';
    if (nameParts.length >= 1) subject = nameParts[0];
    return { subject };
}

// โหลดไฟล์จาก Google Drive
async function loadFilesData() {
    showLoading('files');

    const url = `https://www.googleapis.com/drive/v3/files?q='${CONFIG.files.folderId}'+in+parents&key=${CONFIG.apiKey}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) throw new Error(data.error.message);
        if (!data.files || data.files.length === 0) throw new Error('ไม่พบข้อมูลในโฟลเดอร์');

        allFiles = data.files
            .filter(file => file.mimeType !== 'application/vnd.google-apps.folder')
            .map(file => {
                const metadata = parseFileNameMetadata(file.name);
                return {
                    id: file.id,
                    name: file.name,
                    subject: metadata.subject,
                    viewLink: file.webViewLink,
                    downloadLink: convertToGoogleDriveDownloadLink(file.id),
                    modifiedTime: new Date(file.modifiedTime),
                    size: file.size
                };
            })
            .sort((a, b) => b.modifiedTime - a.modifiedTime);

        renderFilesTable(allFiles);

    } catch (err) {
        console.error(err);
        showError('files', 'โหลดข้อมูลไฟล์ล้มเหลว: ' + err.message);
    }
}

// แสดงผลตารางไฟล์
function renderFilesTable(files) {
    const tbody = document.querySelector('#files-table tbody');

    if (!files.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="no-results">
            <i class="fas fa-search"></i> ไม่พบไฟล์
        </td></tr>`;
        return;
    }

    tbody.innerHTML = files.map(f => `
        <tr>
            <td data-label="วิชา">${f.name}</td>
            <td data-label="">
                ${generateActionButtonsForDrive(f)}
            </td>
        </tr>
    `).join('');
}

function generateActionButtonsForDrive(file) {
    return `
        <div class="action-buttons">
            <a href="${file.viewLink}" target="_blank" class="btn btn-view" title="ดูไฟล์">
                <i class="fas fa-eye"></i> ดู
            </a>
            <a href="${file.downloadLink}" target="_blank" class="btn btn-download" title="ดาวน์โหลดไฟล์">
                <i class="fas fa-download"></i> ดาวน์โหลด
            </a>
        </div>
    `;
}

// โหลดตารางเรียน
async function loadScheduleData() {
    showLoading('schedule');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.schedule.sheetId}/values/${CONFIG.schedule.sheetName}?key=${CONFIG.apiKey}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) throw new Error(data.error.message);
        if (!data.values || data.values.length === 0) throw new Error('ไม่พบข้อมูลตารางเรียน');

        scheduleData = data.values;
        renderScheduleTable(scheduleData);

    } catch (err) {
        console.error(err);
        showError('schedule', 'โหลดตารางเรียนล้มเหลว: ' + err.message);
    }
}

function renderScheduleTable(data) {
    const tbody = document.querySelector('#schedule-table tbody');
    if (!data.length || data.length < 2) {
        tbody.innerHTML = `<tr><td colspan="8" class="no-results">
            <i class="fas fa-calendar-times"></i> ไม่พบข้อมูลตารางเรียน
        </td></tr>`;
        return;
    }

    const thead = document.querySelector('#schedule-table thead');
    thead.innerHTML = `
        <tr>
            <th>Date</th>
            <th>M.1/3</th>
            <th>M.1/4</th>
            <th>M.1/5</th>
            <th>M.1/6</th>
            <th>M.1/7</th>
            <th>M.1/8</th>
            <th>M.1/9</th>
        </tr>
    `;

    const rows = [];
    for (let i = 1; i < data.length; i += 2) {
        const subjectRow = data[i];
        const teacherRow = data[i + 1];
        if (!subjectRow || !subjectRow[0]) continue;

        rows.push(`
            <tr>
                <td class="date-cell">${subjectRow[0]}</td>
                ${[1,2,3,4,5,6,7].map((j, idx) => `
                    <td>
                        <div class="subject-info">
                            <div>${subjectRow[j] || ''}</div>
                            <div>${teacherRow ? teacherRow[j] || '' : ''}</div>
                        </div>
                    </td>
                `).join('')}
            </tr>
        `);
    }

    tbody.innerHTML = rows.join('');
}

// Utility
function showLoading(type) {
    const tableId = type === 'files' ? 'files-table' : 'schedule-table';
    const tbody = document.querySelector(`#${tableId} tbody`);
    const colspan = type === 'files' ? 5 : 8;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="loading">
        <i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...
    </td></tr>`;
}

function showError(type, msg) {
    const tableId = type === 'files' ? 'files-table' : 'schedule-table';
    const tbody = document.querySelector(`#${tableId} tbody`);
    const colspan = type === 'files' ? 5 : 8;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="error">
        <i class="fas fa-exclamation-triangle"></i> ${msg}
    </td></tr>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFilesData();
});
