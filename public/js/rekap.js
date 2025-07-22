// Pastikan firebase-config.js, firebase-app.js, firebase-auth.js, dan firebase-database.js sudah dimuat
const database = firebase.database();
const absensiRef = database.ref('absensi'); // Data absensi
const studentsRef = database.ref('students'); // Data daftar siswa

const rekapClassSelect = document.getElementById('rekapClassSelect');
const rekapTableBody = document.querySelector('#rekapTable tbody');
const downloadRekapBtn = document.getElementById('downloadRekapBtn');
const logoutBtn = document.getElementById('logoutBtn');

let currentRekapClass = rekapClassSelect.value;
let allRekapData = []; // Untuk menyimpan data rekap yang ditampilkan

// Fungsi untuk mengecek otentikasi
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'index.html'; // Arahkan kembali ke halaman login jika belum login
    } else {
        loadRekap(currentRekapClass); // Muat rekap setelah login
    }
});

logoutBtn.addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Error logout:', error);
    });
});

rekapClassSelect.addEventListener('change', (e) => {
    currentRekapClass = e.target.value;
    loadRekap(currentRekapClass);
});

// Memuat data rekap absensi berdasarkan kelas
function loadRekap(kelas) {
    rekapTableBody.innerHTML = ''; // Kosongkan tabel
    allRekapData = []; // Reset data rekap

    absensiRef.child(kelas).orderByKey().once('value', (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((dateSnapshot) => {
                const date = dateSnapshot.key; // Tanggal (YYYY-MM-DD)
                const absensiOnDate = dateSnapshot.val();

                for (let studentId in absensiOnDate) {
                    const absensiEntry = absensiOnDate[studentId];
                    const row = rekapTableBody.insertRow();
                    row.dataset.date = date; // Simpan tanggal di dataset baris
                    row.dataset.studentId = studentId; // Simpan studentId di dataset baris

                    // Format tanggal untuk tampilan
                    const displayDate = new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

                    row.innerHTML = `
                        <td>${displayDate}</td>
                        <td>${absensiEntry.name}</td>
                        <td>
                            <select class="edit-status" data-original-status="${absensiEntry.status}">
                                <option value="Hadir" ${absensiEntry.status === 'Hadir' ? 'selected' : ''}>Hadir</option>
                                <option value="Sakit" ${absensiEntry.status === 'Sakit' ? 'selected' : ''}>Sakit</option>
                                <option value="Izin" ${absensiEntry.status === 'Izin' ? 'selected' : ''}>Izin</option>
                                <option value="Alfa" ${absensiEntry.status === 'Alfa' ? 'selected' : ''}>Alfa</option>
                                <option value="Tanpa Keterangan" ${absensiEntry.status === 'Tanpa Keterangan' ? 'selected' : ''}>Tanpa Keterangan</option>
                            </select>
                        </td>
                        <td>
                            <button class="btn-edit" data-date="${date}" data-student-id="${studentId}">Edit</button>
                            <button class="btn-delete" data-date="${date}" data-student-id="${studentId}">Delete</button>
                        </td>
                    `;
                    allRekapData.push({
                        date: displayDate,
                        studentName: absensiEntry.name,
                        status: absensiEntry.status
                    });
                }
            });
            addRekapEventListeners(); // Tambahkan event listener setelah data dimuat
        } else {
            rekapTableBody.innerHTML = '<tr><td colspan="4">Belum ada data absensi untuk kelas ini.</td></tr>';
        }
    });
}

// Tambahkan event listener untuk tombol edit dan delete
function addRekapEventListeners() {
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', (e) => {
            const date = e.target.dataset.date;
            const studentId = e.target.dataset.studentId;
            const selectElement = e.target.closest('tr').querySelector('.edit-status');
            const newStatus = selectElement.value;

            // Update di Firebase
            absensiRef.child(currentRekapClass).child(date).child(studentId).update({ status: newStatus })
                .then(() => {
                    alert('Data berhasil diupdate!');
                    loadRekap(currentRekapClass); // Muat ulang data
                })
                .catch((error) => {
                    console.error('Error updating data:', error);
                    alert('Gagal mengupdate data: ' + error.message);
                });
        });
    });

    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const date = e.target.dataset.date;
            const studentId = e.target.dataset.studentId;

            if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                // Hapus dari Firebase
                absensiRef.child(currentRekapClass).child(date).child(studentId).remove()
                    .then(() => {
                        alert('Data berhasil dihapus!');
                        loadRekap(currentRekapClass); // Muat ulang data
                    })
                    .catch((error) => {
                        console.error('Error deleting data:', error);
                        alert('Gagal menghapus data: ' + error.message);
                    });
            }
        });
    });
}

// Unduh Rekap PDF
downloadRekapBtn.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); // Landscape orientation

    const tableData = allRekapData.map(item => [item.date, item.studentName, item.status]);
    const tableHeaders = ['Tanggal', 'Nama Siswa', 'Keterangan'];

    doc.setFontSize(16);
    doc.text(`REKAP ABSENSI SISWA FILIAL SMPN 2 CILELES - Kelas ${currentRekapClass}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

    doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 30,
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        theme: 'grid',
        styles: {
            fontSize: 10,
            halign: 'center'
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255
        },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 70, halign: 'left' },
            2: { cellWidth: 40 }
        }
    });

    doc.save(`Rekap_Absensi_Kelas_${currentRekapClass}.pdf`);
});