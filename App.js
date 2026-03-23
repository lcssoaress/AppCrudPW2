import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Keyboard, Alert } from 'react-native';
import { db, auth } from './firebaseConfig';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { Trash2, Edit3, Plus, LogOut, ArrowLeft } from 'lucide-react-native';

export default function App() {
  // Estados de Autenticação e Navegação Interna
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true); // Controla qual tela exibir
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Estados do CRUD
  const [task, setTask] = useState('');
  const [taskList, setTaskList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      const tasksRef = ref(db, `users/${user.uid}/tasks`);
      return onValue(tasksRef, (snapshot) => {
        const data = snapshot.val();
        setTaskList(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
      });
    }
  }, [user]);

  const handleAuth = async () => {
    if (!email || !password) return alert("Preencha todos os campos!");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Conta criada com sucesso!");
      }
    } catch (error) {
      alert("Erro: " + error.message);
    }
  };

  const handleSave = () => {
    if (!task.trim()) return;
    const path = `users/${user.uid}/tasks`;
    editingId ? update(ref(db, `${path}/${editingId}`), { name: task }) : push(ref(db, path), { name: task });
    setTask('');
    setEditingId(null);
    Keyboard.dismiss();
  };

  // --- TELAS DE AUTENTICAÇÃO SEPARADAS ---
  if (!user) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authCard}>
          {!isLogin && (
            <TouchableOpacity onPress={() => setIsLogin(true)} style={styles.backBtn}>
              <ArrowLeft color="#4B5563" size={20} />
            </TouchableOpacity>
          )}
          
          <Text style={styles.authTitle}>{isLogin ? "Bem-vindo de volta" : "Criar nova conta"}</Text>
          
          <TextInput 
            style={styles.inputAuth} 
            placeholder="E-mail" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none"
          />
          <TextInput 
            style={styles.inputAuth} 
            placeholder="Senha" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={handleAuth}>
            <Text style={styles.btnText}>{isLogin ? "ENTRAR" : "CADASTRAR"}</Text>
          </TouchableOpacity>

          {isLogin ? (
            <TouchableOpacity onPress={() => setIsLogin(false)}>
              <Text style={styles.toggleText}>Não tem uma conta? <Text style={styles.bold}>Cadastre-se</Text></Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsLogin(true)}>
              <Text style={styles.toggleText}>Já possui conta? <Text style={styles.bold}>Faça login</Text></Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // --- TELA DO CRUD ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Minhas Tarefas</Text>
        <TouchableOpacity onPress={() => signOut(auth)}><LogOut color="#EF4444" size={24} /></TouchableOpacity>
      </View>
      <View style={styles.inputGroup}>
        <TextInput style={styles.inputTask} placeholder="Nova tarefa..." value={task} onChangeText={setTask} />
        <TouchableOpacity style={styles.btnAdd} onPress={handleSave}>
          {editingId ? <Edit3 color="#FFF" /> : <Plus color="#FFF" />}
        </TouchableOpacity>
      </View>
      <FlatList
        data={taskList}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <Text style={styles.taskText}>{item.name}</Text>
            <View style={styles.taskActions}>
              <TouchableOpacity onPress={() => { setTask(item.name); setEditingId(item.id); }}><Edit3 color="#4B5563" size={20} /></TouchableOpacity>
              <TouchableOpacity onPress={() => remove(ref(db, `users/${user.uid}/tasks/${item.id}`))}><Trash2 color="#EF4444" size={20} /></TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  authCard: { width: '90%', maxWidth: 400, backgroundColor: '#FFF', padding: 30, borderRadius: 20, shadowOpacity: 0.1, elevation: 5 },
  authTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', color: '#1F2937' },
  inputAuth: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 15 },
  btnPrimary: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  toggleText: { textAlign: 'center', color: '#6B7280' },
  bold: { color: '#F59E0B', fontWeight: 'bold' },
  backBtn: { marginBottom: 10 },
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  title: { fontSize: 26, fontWeight: 'bold' },
  inputGroup: { flexDirection: 'row', marginBottom: 25 },
  inputTask: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#DDD' },
  btnAdd: { backgroundColor: '#F59E0B', marginLeft: 10, padding: 15, borderRadius: 12, justifyContent: 'center' },
  taskCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, elevation: 2 },
  taskText: { fontSize: 16, flex: 1 },
  taskActions: { flexDirection: 'row', gap: 15 }
});
