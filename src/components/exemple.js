import bcrypt from 'bcrypt';

const saltRounds = 10;
const password = 'Ensat1984';

bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
  if (err) {
    console.error('Erreur de hachage:', err);
  } else {
    console.log('Mot de passe haché:', hashedPassword);
  }
});