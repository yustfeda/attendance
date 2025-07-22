// Pastikan firebase-config.js sudah dimuat sebelumnya
const auth = firebase.auth();

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Berhasil login
            window.location.href = 'absensi.html'; // Arahkan ke halaman absensi
        })
        .catch((error) => {
            // Gagal login
            errorMessage.textContent = 'Login gagal'
        });
});

// Otomatis mengarahkan jika sudah login
auth.onAuthStateChanged(user => {
    if (user) {
        window.location.href = 'absensi.html';
    }
});