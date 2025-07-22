// Pastikan firebase-config.js, firebase-app.js, firebase-auth.js, dan firebase-database.js sudah dimuat
const database = firebase.database();
const absensiRef = database.ref('absensi');
const studentsRef = database.ref('students');

const classSelect = document.getElementById('classSelect');
const absensiTableBody = document.querySelector('#absensiTable tbody');
const saveAbsensiBtn = document.getElementById('saveAbsensiBtn');
const downloadAbsensiBtn = document.getElementById('downloadAbsensiBtn');
const currentDateSpan = document.getElementById('currentDate');
const logoutBtn = document.getElementById('logoutBtn');
const addStudentBtn = document.getElementById('addStudentBtn');
const addStudentModal = document.getElementById('addStudentModal');
const closeButton = document.querySelector('.close-button');
const submitNewStudent = document.getElementById('submitNewStudent');
const newStudentNameInput = document.getElementById('newStudentName');

let currentClass = classSelect.value;
let studentsData = {}; // Cache data siswa

// Fungsi untuk mengecek otentikasi
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'index.html'; // Arahkan kembali ke halaman login jika belum login
    } else {
        loadStudents(currentClass); // Muat siswa setelah login
    }
});

logoutBtn.addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Error logout:', error);
    });
});

// Menampilkan tanggal otomatis
const today = new Date();
const options = { year: 'numeric', month: 'long', day: 'numeric' };
currentDateSpan.textContent = today.toLocaleDateString('id-ID', options);

classSelect.addEventListener('change', (e) => {
    currentClass = e.target.value;
    loadStudents(currentClass);
});

// Memuat data siswa berdasarkan kelas
function loadStudents(kelas) {
    absensiTableBody.innerHTML = ''; // Kosongkan tabel
    studentsRef.child(kelas).once('value', (snapshot) => {
        studentsData[kelas] = snapshot.val() || {};
        let i = 1;
        for (let studentId in studentsData[kelas]) {
            const student = studentsData[kelas][studentId];
            const row = absensiTableBody.insertRow();
            row.innerHTML = `
                <td>${i++}</td>
                <td>${student.name}</td>
                <td>
                    <select class="absensi-status" data-student-id="${studentId}">
                        <option value="Hadir">Hadir</option>
                        <option value="Sakit">Sakit</option>
                        <option value="Izin">Izin</option>
                        <option value="Alfa">Alfa</option>
                        <option value="Tanpa Keterangan">Tanpa Keterangan</option>
                    </select>
                </td>
            `;
        }
    });
}

// Menyimpan absensi
saveAbsensiBtn.addEventListener('click', () => {
    const absensiEntries = {};
    const dateKey = today.toISOString().slice(0, 10); // Format YYYY-MM-DD

    document.querySelectorAll('.absensi-status').forEach(select => {
        const studentId = select.dataset.studentId;
        const status = select.value;
        const studentName = studentsData[currentClass][studentId].name; // Ambil nama siswa
        absensiEntries[studentId] = {
            name: studentName,
            status: status,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
    });

    absensiRef.child(currentClass).child(dateKey).set(absensiEntries)
        .then(() => {
            alert('Absensi berhasil disimpan!');
        })
        .catch((error) => {
            console.error('Error saving absensi:', error);
            alert('Gagal menyimpan absensi: ' + error.message);
        });
});

// Menambah siswa baru
addStudentBtn.addEventListener('click', () => {
    addStudentModal.style.display = 'block';
});

closeButton.addEventListener('click', () => {
    addStudentModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == addStudentModal) {
        addStudentModal.style.display = 'none';
    }
});

submitNewStudent.addEventListener('click', () => {
    const studentName = newStudentNameInput.value.trim();
    if (studentName) {
        studentsRef.child(currentClass).push({ name: studentName })
            .then(() => {
                alert('Siswa berhasil ditambahkan!');
                newStudentNameInput.value = '';
                addStudentModal.style.display = 'none';
                loadStudents(currentClass); // Muat ulang daftar siswa
            })
            .catch((error) => {
                console.error('Error adding student:', error);
                alert('Gagal menambahkan siswa: ' + error.message);
            });
    } else {
        alert('Nama siswa tidak boleh kosong!');
    }
});

// Unduh Absen (PDF)
downloadAbsensiBtn.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); // Landscape orientation

    const tableData = [];
    const tableHeaders = ['No.', 'Nama Siswa', 'Keterangan'];

    // Ambil data dari tabel HTML
    const rows = absensiTableBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const studentName = row.cells[1].textContent;
        const status = row.cells[2].querySelector('.absensi-status').value;
        tableData.push([index + 1, studentName, status]);
    });

    doc.setFontSize(16);
    doc.text(`ABSENSI SISWA FILIAL SMPN 2 CILELES - Kelas ${currentClass}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Tanggal: ${currentDateSpan.textContent}`, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

    doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 40,
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        theme: 'grid',
        styles: {
            fontSize: 10,
            halign: 'center'
        },
        headStyles: {
            fillColor: [41, 128, 185], // Warna biru untuk header
            textColor: 255
        },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 80, halign: 'left' },
            2: { cellWidth: 50 }
        }
    });

    const finalY = doc.autoTable.previous.finalY;

    // Tanda Tangan Guru Mapel
    doc.setFontSize(10);
    doc.text('Sukabumi, ' + currentDateSpan.textContent, doc.internal.pageSize.getWidth() - 80, finalY + 20);
    doc.text('Guru Mata Pelajaran Bahasa Inggris,', doc.internal.pageSize.getWidth() - 80, finalY + 30);
    doc.text('Danu Septiana, S.Pd.', doc.internal.pageSize.getWidth() - 80, finalY + 60);

    doc.save(`Absensi_Kelas_${currentClass}_${today.toISOString().slice(0, 10)}.pdf`);
});