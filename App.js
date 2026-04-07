import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Keyboard, Alert, Image, ActivityIndicator } from 'react-native';
import { db, auth } from './firebaseConfig';
import { ref, push, onValue, remove, update, set, get } from 'firebase/database';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker'; // NOVO: Seletor de imagens
import { Trash2, Edit3, Plus, LogOut, ArrowLeft, ToggleLeft, ToggleRight, ImageIcon, X, Users, Settings } from 'lucide-react-native'; // NOVO: Ícones

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [task, setTask] = useState('');
  const [taskList, setTaskList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // --- NOVOS ESTADOS PARA IMAGEM ---
  const [image, setImage] = useState(null); // URI local da imagem selecionada
  const [uploading, setUploading] = useState(false); // Status de upload

  // --- CONFIGURAÇÃO CLOUDINARY (Substitua pelos seus dados) ---
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/SEU_CLOUD_NAME/image/upload";
  const UPLOAD_PRESET = "SEU_PRESET_UNSIGNED";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          setUserRole(snapshot.val().role || 'user');
        }
      } else {
        setUserRole('user');
      }
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

  const [screen, setScreen] = useState('main');
  const [allUsers, setAllUsers] = useState([]);
  const [featureFlags, setFeatureFlags] = useState({ deleteEnabled: true });
  const [adminTab, setAdminTab] = useState('users');

  useEffect(() => {
    if (userRole === 'admin') {
      const usersRef = ref(db, 'users');
      return onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        setAllUsers(data ? Object.keys(data).map(key => ({ uid: key, ...data[key] })) : []);
      });
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === 'admin') {
      const flagsRef = ref(db, 'featureFlags');
      return onValue(flagsRef, (snapshot) => {
        const data = snapshot.val();
        setFeatureFlags(data || { deleteEnabled: true });
      });
    }
  }, [userRole]);

  // --- FUNÇÃO PARA SELECIONAR IMAGEM ---
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // --- FUNÇÃO PARA SUBIR NO CLOUDINARY ---
  const uploadImage = async (uri) => {
    const data = new FormData();
    data.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    });
    data.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: data,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = await response.json();
      return result.secure_url; // URL pública da imagem
    } catch (error) {
      Alert.alert("Erro", "Falha ao subir imagem para o Cloudinary");
      return null;
    }
  };

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert("Aviso", "Preencha todos os campos!");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await set(ref(db, `users/${userCredential.user.uid}`), { email, role: 'user' });
      }
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  };

  const handleSave = async () => {
    if (!task.trim() && !image) return;

    setUploading(true);
    let finalImageUrl = null;

    // Se houver uma nova imagem selecionada, faz o upload
    if (image && image.startsWith('file://')) {
      finalImageUrl = await uploadImage(image);
    } else if (image) {
      finalImageUrl = image; // Mantém a URL se já for do Cloudinary (edição)
    }

    const path = `users/${user.uid}/tasks`;
    const data = { 
      name: task, 
      imageUrl: finalImageUrl,
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      await update(ref(db, `${path}/${editingId}`), data);
    } else {
      await push(ref(db, path), data);
    }

    setTask('');
    setImage(null);
    setEditingId(null);
    setUploading(false);
    Keyboard.dismiss();
  };

  const AdminScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('main')}>
          <ArrowLeft color="#4B5563" size={26} />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, adminTab === 'users' && styles.activeTab]} onPress={() => setAdminTab('users')}>
          <Users color={adminTab === 'users' ? '#F59E0B' : '#6B7280'} size={20} />
          <Text style={[styles.tabText, adminTab === 'users' && styles.activeTabText]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, adminTab === 'flags' && styles.activeTab]} onPress={() => setAdminTab('flags')}>
          <Settings color={adminTab === 'flags' ? '#F59E0B' : '#6B7280'} size={20} />
          <Text style={[styles.tabText, adminTab === 'flags' && styles.activeTabText]}>Feature Flags</Text>
        </TouchableOpacity>
      </View>
      {adminTab === 'users' && (
        <FlatList
          data={allUsers}
          keyExtractor={item => item.uid}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userRole}>Role: {item.role}</Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity onPress={() => {
                  const newRole = item.role === 'admin' ? 'user' : 'admin';
                  update(ref(db, `users/${item.uid}`), { ...item, role: newRole });
                }}>
                  <Text style={styles.actionText}>Toggle Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  Alert.alert("Confirm", "Delete user?", [
                    { text: "Cancel" },
                    { text: "Delete", onPress: () => remove(ref(db, `users/${item.uid}`)) }
                  ]);
                }}>
                  <Trash2 color="#EF4444" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      {adminTab === 'flags' && (
        <View style={styles.flagsContainer}>
          <View style={styles.flagItem}>
            <Text style={styles.flagText}>Enable Delete Tasks</Text>
            <TouchableOpacity onPress={() => update(ref(db, 'featureFlags'), { ...featureFlags, deleteEnabled: !featureFlags.deleteEnabled })}>
              {featureFlags.deleteEnabled ? <ToggleRight color="#10B981" size={30} /> : <ToggleLeft color="#9CA3AF" size={30} />}
            </TouchableOpacity>
          </View>
          {/* Add more flags if needed */}
        </View>
      )}
    </View>
  );

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authCard}>
          {!isLogin && (
            <TouchableOpacity onPress={() => setIsLogin(true)} style={styles.backBtn}>
              <ArrowLeft color="#4B5563" size={20} />
            </TouchableOpacity>
          )}
          <Text style={styles.authTitle}>{isLogin ? "Bem-vindo" : "Nova conta"}</Text>
          <TextInput style={styles.inputAuth} placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <TextInput style={styles.inputAuth} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleAuth}>
            <Text style={styles.btnText}>{isLogin ? "ENTRAR" : "CADASTRAR"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.toggleText}>
              {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Login"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (screen === 'admin') {
    return <AdminScreen />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}> 
          <Text style={styles.title}>Tarefas & Fotos</Text>
          <View style={[styles.roleBadge, { backgroundColor: userRole === 'admin' ? '#10B981' : '#6B7280' }]}>
            <Text style={styles.roleText}>{userRole.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          {userRole === 'admin' && (
            <TouchableOpacity onPress={() => update(ref(db, 'featureFlags'), { ...featureFlags, deleteEnabled: !featureFlags.deleteEnabled })}>
              {featureFlags.deleteEnabled ? <ToggleRight color="#10B981" size={34} /> : <ToggleLeft color="#9CA3AF" size={34} />}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => signOut(auth)}>
            <LogOut color="#EF4444" size={26} />
          </TouchableOpacity>
          {userRole === 'admin' && (
            <TouchableOpacity onPress={() => setScreen('admin')}>
              <Users color="#4B5563" size={26} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* INPUT GROUP COM IMAGE PICKER */}
      <View style={styles.inputSection}>
        <View style={styles.inputGroup}>
          <TextInput 
            style={styles.inputTask} 
            placeholder="O que vamos fazer?" 
            value={task} 
            onChangeText={setTask} 
          />
          <TouchableOpacity style={styles.btnImage} onPress={pickImage}>
            <ImageIcon color={image ? "#F59E0B" : "#9CA3AF"} size={24} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.btnAdd, { opacity: uploading ? 0.5 : 1 }]} 
            onPress={handleSave}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator color="#FFF" /> : (editingId ? <Edit3 color="#FFF" /> : <Plus color="#FFF" />)}
          </TouchableOpacity>
        </View>

        {image && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)}>
              <X color="#FFF" size={16} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={taskList}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <View style={styles.taskContent}>
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.taskImage} />
              )}
              <Text style={styles.taskText}>{item.name}</Text>
            </View>
            
            <View style={styles.taskActions}>
              <TouchableOpacity onPress={() => { 
                setTask(item.name); 
                setEditingId(item.id); 
                setImage(item.imageUrl); // Carrega imagem na edição
              }}>
                <Edit3 color="#4B5563" size={20} />
              </TouchableOpacity>
              
              {featureFlags.deleteEnabled && (
                <TouchableOpacity onPress={() => remove(ref(db, `users/${user.uid}/tasks/${item.id}`))}>
                  <Trash2 color="#EF4444" size={20} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  authCard: { width: '90%', maxWidth: 400, backgroundColor: '#FFF', padding: 30, borderRadius: 20, elevation: 5 },
  authTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  inputAuth: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 15 },
  btnPrimary: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  toggleText: { textAlign: 'center', color: '#6B7280' },
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1F2937' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  roleText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  inputSection: { marginBottom: 25 },
  inputGroup: { flexDirection: 'row', gap: 10 },
  inputTask: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#DDD' },
  btnImage: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DDD', justifyContent: 'center' },
  btnAdd: { backgroundColor: '#F59E0B', padding: 15, borderRadius: 12, justifyContent: 'center', minWidth: 50 },
  previewContainer: { marginTop: 10, position: 'relative', width: 100 },
  previewImage: { width: 100, height: 100, borderRadius: 12 },
  removeImage: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 10, padding: 2 },
  taskCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 12, elevation: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  taskImage: { width: 50, height: 50, borderRadius: 8 },
  taskText: { fontSize: 16, color: '#374151', flex: 1 },
  taskActions: { flexDirection: 'row', gap: 15 },
  tabs: { flexDirection: 'row', marginBottom: 20 },
  tab: { flex: 1, alignItems: 'center', padding: 10, borderBottomWidth: 2, borderBottomColor: '#E5E7EB' },
  activeTab: { borderBottomColor: '#F59E0B' },
  tabText: { fontSize: 16, color: '#6B7280' },
  activeTabText: { color: '#F59E0B', fontWeight: 'bold' },
  userCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 12, elevation: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 16, color: '#374151' },
  userRole: { fontSize: 14, color: '#6B7280' },
  userActions: { flexDirection: 'row', gap: 15, alignItems: 'center' },
  actionText: { color: '#F59E0B', fontWeight: 'bold' },
  flagsContainer: { padding: 20 },
  flagItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  flagText: { fontSize: 16, color: '#374151' }
});
