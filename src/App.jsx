/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  LayoutDashboard,
  ClipboardList,
  Building2,
  Settings,
  ChevronRight,
  User,
  X,
  AlertTriangle,
  History,
  Activity,
  HardHat,
  Users,
  LogOut,
  ShieldCheck,
  UserPlus,
  LogIn,
  Loader2,
  Check,
  UserMinus,
  Clock,
  Briefcase,
  IdCard,
  Phone,
  Hash,
  Filter,
  Home,
  Map,
  Save,
  Trash2,
  Bell,
  BellRing,
  Hospital,
  MapPin,
  Calendar as CalendarIcon,
  ChevronLeft,
  Pencil,
  MessageSquare,
  Send,
  Menu,
  RotateCcw,
  XCircle,
  Download as DownloadIcon,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  orderBy,
  setDoc,
  getDoc,
  where
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getToken } from 'firebase/messaging';
import { db, auth, messaging } from './lib/firebase';
import { ServiceOrder, ServiceStatus, DashboardStats, Priority, HealthUnit, UserProfile, UserRole, Department, AppNotification, UserStatus } from './types';
import { MOCK_SERVICES, MOCK_UNITS } from './constants';

type Page = 'dashboard' | 'services' | 'units' | 'admin';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'abraaoadllerpaes@gmail.com';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const CHART_COLORS = ['#16ae8a', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [services, setServices] = useState<ServiceOrder[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allUnits, setAllUnits] = useState<HealthUnit[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeNotification, setActiveNotification] = useState<AppNotification | null>(null);
  const [filter, setFilter] = useState<ServiceStatus | 'Todos'>('Todos');
  const [teamFilter, setTeamFilter] = useState<Department | 'Todas'>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [orderToComplete, setOrderToComplete] = useState<ServiceOrder | null>(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[] | null>(null);
  const [viewingPhotoIdx, setViewingPhotoIdx] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  
  // States para Relatórios
  const [reportUnitId, setReportUnitId] = useState<string>('all');
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth());
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  
  // Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<'IDLE' | 'PERMITTED' | 'REGISTERED' | 'ERROR'>('IDLE');
  const [debugLog, setDebugLog] = useState<string>('');

  // Dashboard e Services são agora visíveis publicamente (Leitura)
  // Mas ações como 'Aprovar Registros' e 'Criar Chamado' exigem Login + Aprovado + Admin
  const isAdminEmail = user?.email === ADMIN_EMAIL;
  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    setFilter('Todos');
    setSearchTerm('');
    setSelectedUnitId(null);
    setIsMobileMenuOpen(false);
  }

  const isUserApproved = (user && profile?.status === 'Aprovado') || isAdminEmail;
  const isUserAdmin = isAdminEmail || (isUserApproved && profile?.role === 'ADMIN');

  // PWA Install Logic & Service Worker Registration
  useEffect(() => {
    // Register Service Worker correctly (check if load already happened)
    const registerSW = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
          .then(reg => console.log('Service Worker registered:', reg.scope))
          .catch(err => console.log('Service Worker registration failed:', err));
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
       setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    // Check if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS) {
       alert("No iPhone/iPad: Toque no ícone de 'Compartilhar' (quadrado com seta para cima) na barra do navegador e selecione 'Adicionar à Tela de Início'.");
       return;
    }

    if (!deferredPrompt) {
       alert("O aplicativo já está instalado ou seu navegador não suporta a instalação automática. Procure por 'Instalar' no menu do navegador.");
       return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  // Request Push Notification Permission
  const hasRequestedToken = React.useRef(false);
  
  // Auth Listener
  useEffect(() => {
    // Ensure persistence is set globally first
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch custom profile from firestore
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        let userProfile: UserProfile | null = null;
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          userProfile = {
            ...data,
            specialties: data.specialties || (data.specialty ? [data.specialty] : ['GERAL'])
          } as UserProfile;
          setProfile(userProfile);
          
          // Request Push Notification Permission - ONLY ONCE PER SESSION
          if (messaging && userProfile && !hasRequestedToken.current) {
            hasRequestedToken.current = true;
            try {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                setPushStatus('PERMITTED');
                
                // Wait for the service worker to be ready before calling getToken
                // This is CRITICAL for iOS stability
                if ('serviceWorker' in navigator) {
                  const registration = await navigator.serviceWorker.ready;
                  console.log("Service Worker ready for messaging:", registration.scope);
                  
                  const token = await getToken(messaging, {
                    serviceWorkerRegistration: registration,
                    vapidKey: 'BI7s--T3DUWgcemxMWHM286HMLVfZr2xPWUqU5NOoilYismCecx8T-pA_Ixs2SD6tQmeHBoocLyp_fFsc7YTpyY'
                  });

                  if (token) {
                    // Register token in Firestore for persistence and server-side push
                    await setDoc(doc(db, 'userTokens', firebaseUser.uid), {
                      token,
                      platform: 'web',
                      updatedAt: serverTimestamp(),
                      specialties: userProfile.specialties || []
                    }, { merge: true });
                    console.log("Push token registered successfully for user status:", userProfile.status);
                    setPushStatus('REGISTERED');
                  } else {
                    setPushStatus('ERROR');
                    setDebugLog('Token não gerado (Browser negou)');
                  }
                } else {
                  setPushStatus('ERROR');
                  setDebugLog('ServiceWorker não suportado');
                }
              } else {
                setPushStatus('ERROR');
                setDebugLog('Permissão Negada pelo Usuário');
              }
            } catch (err: any) {
              console.error('Error getting FCM token:', err);
              setPushStatus('ERROR');
              
              // More detailed error for iOS debugging
              let errorMsg = err.message || 'Erro Desconhecido';
              if (err.code === 'messaging/permission-blocked') errorMsg = 'Notificação Bloqueada no iOS';
              if (err.code === 'messaging/unsupported-browser') errorMsg = 'Navegador sem suporte Push';
              
              setDebugLog(errorMsg);
              // Reset if failed to allow retry on next auth change/reload
              hasRequestedToken.current = false;
            }
          }
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
        hasRequestedToken.current = false;
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [messaging]);

  // Real-time listener for Work Orders
  useEffect(() => {
    let q;
    // Se logado e aprovado como especialista (e não ADMIN/GERAL), filtra por categorias atribuídas
    const userSpecialties = profile?.specialties || [];
    if (profile && profile.status === 'Aprovado' && profile.role !== 'ADMIN' && !userSpecialties.includes('GERAL')) {
      q = query(
        collection(db, 'workOrders'), 
        where('category', 'in', userSpecialties.length > 0 ? userSpecialties : ['GERAL']),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Visitantes, Admins ou Pendentes veem tudo (transparência pública)
      q = query(collection(db, 'workOrders'), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as ServiceOrder[];
      
      setServices(data);
    }, (error) => {
      console.error("Firestore error:", error);
      if (services.length === 0) setServices(MOCK_SERVICES);
    });

    return () => unsubscribe();
  }, [profile]);

  // Real-time listener for Health Units
  useEffect(() => {
    const q = query(collection(db, 'healthUnits'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as HealthUnit[];
      setAllUnits(data);
    }, (error) => {
      console.error("Units error:", error);
      if (allUnits.length === 0) setAllUnits(MOCK_UNITS);
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for Users (Admin only)
  useEffect(() => {
    if (!isUserAdmin) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(data);
    });

    return () => unsubscribe();
  }, [isUserAdmin]);

  // Real-time listener for Notifications (Assignments)
  useEffect(() => {
    if (!user || !profile) return;

    // Use a reference to track if it's the first load
    let isInitialLoad = true;
    const specialties = profile.specialties || [];
    
    const q = query(
      collection(db, 'notifications'), 
      where('category', 'in', [...specialties, 'GERAL']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as AppNotification[];
      
      setNotifications(data);

      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const notification = { ...change.doc.data(), id: change.doc.id } as AppNotification;
          setActiveNotification(notification);
          // Auto hide after 8 seconds
          setTimeout(() => setActiveNotification(prev => prev?.id === notification.id ? null : prev), 8000);
        }
      });
    }, (err) => {
      console.error("Notifications Sync Error:", err);
    });

    return () => unsubscribe();
  }, [user, profile]);

  const processedServices = useMemo(() => {
    const now = Date.now();
    const SLA_MS = 48 * 60 * 60 * 1000;
    
    // Se o usuário estiver logado, mostramos APENAS dados reais para não confundir.
    // Se for um visitante deslogado, mostramos os exemplos para demonstração.
    const baseSource = (user || services.length > 0) ? services : MOCK_SERVICES;

    return baseSource.map(s => {
      // Calculate delay virtually
      const createdAt = s.createdAt ? (typeof s.createdAt === 'string' ? new Date(s.createdAt).getTime() : (s.createdAt as any).toDate?.().getTime() || now) : now;
      
      if (s.status === 'Aguardando recebimento' && (now - createdAt > SLA_MS)) {
        return { ...s, status: 'ATRASADO' as ServiceStatus };
      }
      return s;
    }).sort((a, b) => {
      // Priority 1: ATRASADO
      if (a.status === 'ATRASADO' && b.status !== 'ATRASADO') return -1;
      if (a.status !== 'ATRASADO' && b.status === 'ATRASADO') return 1;
      
      // Secondary: Date desc
      const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any).toDate?.().getTime() || 0) : 0;
      const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any).toDate?.().getTime() || 0) : 0;
      return dateB - dateA;
    });
  }, [services]);

  const stats: DashboardStats = useMemo(() => {
    return {
      totalOrders: processedServices.length,
      awaitingOrders: processedServices.filter(s => s.status === 'Aguardando recebimento').length,
      inProgressOrders: processedServices.filter(s => s.status === 'EM ANDAMENTO').length,
      completedOrders: processedServices.filter(s => s.status === 'CONCLUIDO').length,
      delayedOrders: processedServices.filter(s => s.status === 'ATRASADO').length,
    };
  }, [processedServices]);

  const filteredServices = useMemo(() => {
    return processedServices.filter(service => {
      // Regra: Na aba 'Todos', mostramos apenas o que não foi concluído
      const matchesFilter = filter === 'Todos' 
        ? service.status !== 'CONCLUIDO' 
        : service.status === filter;

      const matchesTeam = teamFilter === 'Todas' || service.category === teamFilter;

      const matchesSearch = service.unitName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           service.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesTeam && matchesSearch;
    });
  }, [processedServices, filter, teamFilter, searchTerm]);

  const reportData = useMemo(() => {
    const filteredForReport = services.filter(s => {
      const date = s.createdAt ? (typeof s.createdAt === 'string' ? new Date(s.createdAt) : (s.createdAt as any).toDate?.()) : null;
      if (!date) return false;
      const matchesMonth = date.getMonth() === reportMonth;
      const matchesYear = date.getFullYear() === reportYear;
      const matchesUnit = reportUnitId === 'all' || s.unitId === reportUnitId;
      return matchesMonth && matchesYear && matchesUnit;
    });

    const categories: Department[] = ['ELÉTRICA', 'HIDRAÚLICAS', 'LIMPEZAS', 'PINTURAS', 'REFORMAS'];
    const breakdownData = categories.map(cat => {
      const count = filteredForReport.filter(s => s.category === cat).length;
      return {
        name: cat,
        value: count,
        percentage: filteredForReport.length > 0 ? (count / filteredForReport.length) * 100 : 0
      };
    }).filter(item => item.value > 0);

    // Group by day 
    const dailyData: { [key: string]: number } = {};
    filteredForReport.forEach(s => {
      const date = s.createdAt ? (typeof s.createdAt === 'string' ? new Date(s.createdAt) : (s.createdAt as any).toDate?.()) : null;
      if (date) {
        const day = date.getDate();
        dailyData[day] = (dailyData[day] || 0) + 1;
      }
    });
    
    const dailyChartData = Array.from({ length: 31 }, (_, i) => ({
      day: `${i + 1}`,
      count: dailyData[i + 1] || 0
    })).filter(d => d.count > 0 || d.day === '1' || d.day === '15' || d.day === '30');

    return {
      total: filteredForReport.length,
      breakdown: breakdownData,
      daily: dailyChartData
    };
  }, [services, reportUnitId, reportMonth, reportYear]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, provider);
      // Profile handled by auth listener and RegistrationForm
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const specialties = Array.from(formData.getAll('specialties')) as Department[];
    
    const newProfile: UserProfile = {
      uid: user.uid,
      name: formData.get('name') as string,
      email: user.email || '',
      matricula: formData.get('matricula') as string,
      cpf: formData.get('cpf') as string,
      specialties: specialties.length > 0 ? specialties : ['GERAL'],
      phone: formData.get('phone') as string,
      role: (user.email || '') === ADMIN_EMAIL ? 'ADMIN' : 'FUNCIONARIO',
      status: (user.email || '') === ADMIN_EMAIL ? 'Aprovado' : 'Pendente',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile);
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    try {
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    } catch (e) {
      console.error("Error marking all as read:", e);
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm("Deseja realmente REMOVER TODOS os alertas da sua lista?")) return;
    try {
      await Promise.all(notifications.map(n => deleteDoc(doc(db, 'notifications', n.id))));
      setIsNotificationPanelOpen(false);
    } catch (e) {
      console.error("Error clearing all notifications:", e);
      alert("Erro ao limpar notificações.");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      console.error("Error deleting notification:", e);
    }
  };

  const updateOrderStatus = async (id: string, newStatus: ServiceStatus) => {
    // Se for concluir, abre o modal de relatório
    if (newStatus === 'CONCLUIDO') {
      const order = processedServices.find(s => s.id === id);
      if (order) {
        setOrderToComplete(order);
        setIsCompletionModalOpen(true);
      }
      return;
    }

    try {
      await updateDoc(doc(db, 'workOrders', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error updating status:", e);
      alert("Erro ao atualizar status no banco de dados.");
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedPhotos(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotosPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotosPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const deleteOrder = async (id: string, title: string) => {
    if (!isUserAdmin) return;
    if (id.startsWith('OS-')) { alert('Chamados de demonstração não podem ser excluídos.'); return; }
    if (!window.confirm('Excluir permanentemente: "' + title + '"?')) return;
    try { await deleteDoc(doc(db, 'workOrders', id)); }
    catch (e) { alert('Erro ao excluir chamado.'); }
  };

  const handleCompleteOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orderToComplete) return;

    const formData = new FormData(e.currentTarget);
    const report = formData.get('completionReport') as string;

    if (orderToComplete.id.startsWith('OS-')) {
      setIsCompletionModalOpen(false);
      setOrderToComplete(null);
      setSelectedPhotos([]);
      setPhotosPreviews([]);
      return;
    }

    if (selectedPhotos.length === 0) {
      alert('⚠️ É obrigatório enviar pelo menos uma foto do serviço antes de concluir!');
      return;
    }

    try {
      setUploadingPhotos(true);
      const photoUrls: string[] = [];

      for (const photo of selectedPhotos) {
        const fd = new FormData();
        fd.append('file', photo);
        fd.append('upload_preset', 'sms_service');
        fd.append('folder', 'workOrders/' + orderToComplete.id);
        const res = await fetch('https://api.cloudinary.com/v1_1/dp3l9ubm9/image/upload', {
          method: 'POST', body: fd,
        });
        const data = await res.json();
        if (data.secure_url) photoUrls.push(data.secure_url);
      }

      await updateDoc(doc(db, 'workOrders', orderToComplete.id), {
        status: 'CONCLUIDO',
        completionReport: report,
        technicianName: profile?.name || user?.displayName || 'Técnico SMS',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        photos: photoUrls,
      });

      setIsCompletionModalOpen(false);
      setOrderToComplete(null);
      setSelectedPhotos([]);
      setPhotosPreviews([]);
      setUploadingPhotos(false);
      alert('✅ Chamado concluído! ' + photoUrls.length + ' foto(s) salva(s).');
    } catch (e) {
      console.error("Error finalizing order:", e);
      setUploadingPhotos(false);
      alert('❌ Erro ao finalizar chamado.');
    }
  };

  const createOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isUserAdmin) return;

    const formData = new FormData(e.currentTarget);
    const unitId = formData.get('unitId') as string;
    const unit = (allUnits.length > 0 ? allUnits : MOCK_UNITS).find(u => u.id === unitId);

    const sigedValue = (formData.get('siged') as string)?.trim() || '';
    const orderData: any = {
      unitId: unitId,
      unitName: unit?.name || 'Unidade Desconhecida',
      siged: sigedValue,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as Department,
      priority: formData.get('priority') as Priority,
      requester: formData.get('requester') as string,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingOrder) {
        // Mode: UPDATE
        await updateDoc(doc(db, 'workOrders', editingOrder.id), orderData);
        setEditingOrder(null);
      } else {
        // Mode: CREATE
        const initialStatus = (formData.get('initialStatus') as ServiceStatus) || 'Aguardando recebimento';
        const newOrder = {
          ...orderData,
          status: initialStatus,
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'workOrders'), newOrder);
        
        // Criar Notificação para os Funcionários da Categoria
        await addDoc(collection(db, 'notifications'), {
          title: initialStatus === 'EM ANDAMENTO' ? 'NOVO CHAMADO ENCAMINHADO!' : 'NOVA DEMANDA PARA VOCÊ!',
          message: `${newOrder.unitName}: ${newOrder.title}`,
          category: newOrder.category,
          orderId: docRef.id,
          read: false,
          createdAt: serverTimestamp()
        });

        // DISPARAR PUSH REAL VIA SERVIDOR
        fetch('/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: newOrder.category,
            title: 'NOVA DEMANDA PARA VOCÊ!',
            message: `${newOrder.unitName}: ${newOrder.title}`,
            orderId: docRef.id
          })
        }).catch(err => console.error("Push Error:", err));
      }

      setIsAddModalOpen(false);
      // Após criar/editar, vai para a aba de informações (Central de Chamados)
      setCurrentPage('services');
    } catch (e) {
      console.error("Error saving order:", e);
    }
  };

  const updateUserStatus = async (targetUid: string, newStatus: 'Aprovado' | 'Rejeitado') => {
    if (!isUserAdmin) return;
    try {
      await updateDoc(doc(db, 'users', targetUid), { status: newStatus });
    } catch (e) {
      console.error("Error updating user:", e);
    }
  };

  const deleteUser = async (targetUid: string, userName: string) => {
    if (!isUserAdmin) return;
    if (targetUid === user?.uid) {
      alert("⚠️ Você não pode excluir seu próprio acesso administrativo por aqui.");
      return;
    }
    
    const confirmMessage = `🛑 ATENÇÃO: Deseja realmente EXCLUIR permanentEMENTE o cadastro de ${userName.toUpperCase()}?\n\nEsta ação não pode ser desfeita e removerá todo o histórico de acesso desta pessoa no sistema.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await deleteDoc(doc(db, 'users', targetUid));
      // Deep clean: try to remove the associated push token too
      try {
        await deleteDoc(doc(db, 'userTokens', targetUid));
      } catch (tokenErr) {
        console.warn("Could not delete associated token (may not exist):", tokenErr);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Erro ao excluir usuário.");
    }
  };

  const saveUserEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isUserAdmin || !editingUser) return;

    const formData = new FormData(e.currentTarget);
    const specialties = Array.from(formData.getAll('specialties')) as Department[];

    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        name: formData.get('name') as string,
        matricula: formData.get('matricula') as string,
        cpf: formData.get('cpf') as string,
        phone: formData.get('phone') as string,
        specialties: specialties.length > 0 ? specialties : ['GERAL'],
        role: formData.get('role') as UserRole,
        status: formData.get('status') as UserStatus
      });
      setIsEditUserModalOpen(false);
      setEditingUser(null);
    } catch (e) {
      console.error("Error updating user:", e);
      alert('Erro ao salvar edições do usuário.');
    }
  };

  const sendAdminMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isUserAdmin) return;

    const formData = new FormData(e.currentTarget);
    const category = formData.get('category') as Department;
    const message = formData.get('message') as string;

    try {
      await addDoc(collection(db, 'notifications'), {
        title: '⚠️ MENSAGEM DO ADMIN',
        message: message,
        category: category,
        orderId: null,
        read: false,
        createdAt: serverTimestamp()
      });

      // DISPARAR PUSH REAL VIA SERVIDOR
      fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title: '⚠️ MENSAGEM DO ADMIN',
          message: message,
          orderId: null
        })
      }).catch(err => console.error("Push Error:", err));

      alert(`Mensagem enviada para a equipe de ${category}!`);
      (e.target as HTMLFormElement).reset();
    } catch (e) {
      console.error("Error sending admin message:", e);
    }
  };

  const handleUnitSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isUserAdmin) return;
    const formData = new FormData(e.currentTarget);
    const unitName = (formData.get('name') as string).trim();
    const unitId = formData.get('unitId') as string;

    // Check for duplicates (only for new units)
    if (!unitId) {
      const exists = (allUnits.length > 0 ? allUnits : MOCK_UNITS).some(
        u => u.name.toLowerCase() === unitName.toLowerCase()
      );
      if (exists) {
        alert(`ERRO: A unidade "${unitName}" já existe na rede!`);
        return;
      }
    }

    const unitData = {
      name: unitName,
      type: formData.get('type') as any,
      region: formData.get('region') as any,
      bairro: formData.get('bairro') as string,
      address: formData.get('address') as string,
      coordinator: formData.get('coordinator') as string,
      coordinatorPhone: formData.get('coordinatorPhone') as string,
    };

    try {
      if (unitId) {
        await updateDoc(doc(db, 'healthUnits', unitId), unitData);
      } else {
        await addDoc(collection(db, 'healthUnits'), unitData);
      }
      (e.target as HTMLFormElement).reset();
      const unitIdInput = (e.target as HTMLFormElement).querySelector('input[name="unitId"]') as HTMLInputElement;
      if (unitIdInput) unitIdInput.value = '';
    } catch (e) {
      console.error("Error saving unit:", e);
    }
  };

  const deleteUnit = async (id: string) => {
    if (!isUserAdmin || !window.confirm('Excluir esta unidade permanentemente?')) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'healthUnits', id));
    } catch (e) {
      console.error("Error deleting unit:", e);
    }
  };

  // Se estiver carregando auth, mostra loader
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans flex flex-col md:flex-row overflow-hidden h-screen">
      {/* Mobile Decorative Strip & Safe Area Spacer (Cuiabá Flag Colors) */}
      <div className="md:hidden flex flex-col w-full shrink-0 sticky top-0 z-[100] shadow-sm">
        <div className="h-4 bg-white w-full" />
        <div className="h-2 bg-[#FBD400] w-full" />
        <div className="h-2 bg-[#00923F] w-full" />
      </div>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-border z-40 sticky top-[32px]">
        <div className="flex items-center gap-2">
          <div className="bg-brand p-1.5 rounded-lg shadow-sm shadow-brand/20 relative">
            <HardHat className="w-5 h-5 text-white" />
            {pushStatus === 'REGISTERED' && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" title="Notificações Ativas" />
            )}
            {pushStatus === 'ERROR' && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full shadow-sm" title="Erro nas Notificações" />
            )}
          </div>
          <h1 className="text-[18px] font-black tracking-tighter text-brand">SMS SERVICE</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 transition-colors active:scale-95 text-brand"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-[100] md:hidden backdrop-blur-sm"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[101] flex flex-col md:hidden overflow-hidden"
            >
              {/* Sidebar Decorative Strip (Cuiabá Flag Colors) */}
              <div className="flex flex-col w-full shrink-0">
                <div className="h-3 bg-white w-full" />
                <div className="h-2 bg-[#FBD400] w-full" />
                <div className="h-2 bg-[#00923F] w-full" />
              </div>

              <div className="px-6 py-6 border-b border-neutral-50 mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-brand p-1.5 rounded-lg shadow-sm shadow-brand/20">
                      <HardHat className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-[20px] font-black tracking-tighter text-brand">SMS SERVICE</h1>
                  </div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest pl-1">Setor de Obras</p>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-text-secondary hover:text-danger p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1">
                <ul className="space-y-1">
                  <SidebarItem 
                    icon={<Home className="w-4 h-4"/>} 
                    label="Início / Dashboard" 
                    active={currentPage === 'dashboard'} 
                    onClick={() => handlePageChange('dashboard')}
                  />
                  <SidebarItem 
                    icon={<ClipboardList className="w-4 h-4"/>} 
                    label="Central de Chamados" 
                    active={currentPage === 'services'} 
                    onClick={() => handlePageChange('services')}
                  />
                  {isUserAdmin && (
                    <SidebarItem 
                      icon={<ShieldCheck className="w-4 h-4"/>} 
                      label={`PORTAL ADMIN: ${profile?.name?.split(' ')[0] || 'ADMIN'}`} 
                      active={currentPage === 'admin'} 
                      onClick={() => handlePageChange('admin')}
                    />
                  )}
                  <SidebarItem 
                    icon={<Building2 className="w-4 h-4"/>} 
                    label="Rede de Saúde (SMS)" 
                    active={currentPage === 'units'} 
                    onClick={() => handlePageChange('units')}
                  />
                </ul>
              </nav>

              <div className="px-5 mt-auto">
                 {user ? (
                   <button 
                     onClick={handleLogout}
                     className="w-full flex items-center justify-between p-4 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-all mb-4"
                   >
                      <div className="flex flex-col items-start overflow-hidden">
                         <span className="text-[11px] font-black text-text-primary truncate w-full">{profile?.name || user.displayName}</span>
                         <span className="text-[9px] font-bold text-text-secondary uppercase">
                           {profile?.role || (isAdminEmail ? 'ADMIN' : 'VISITANTE')}
                         </span>
                      </div>
                      <LogOut className="w-4 h-4 text-text-secondary" />
                   </button>
                 ) : (
                   <button 
                     onClick={handleLogin}
                     className="w-full flex items-center justify-center gap-2 p-4 bg-brand text-white rounded-2xl hover:brightness-110 transition-all mb-4 font-black text-xs"
                   >
                      <LogIn className="w-4 h-4" /> ENTRAR NO SISTEMA
                   </button>
                 )}
                <div className="bg-brand/5 border border-brand/10 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[11px] font-bold text-brand uppercase">Rede Ativa</span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-tight">Prefeitura de Cuiabá - Saúde Municipal</p>
                </div>
                {pushStatus === 'ERROR' && (
                  <div className="mt-2 space-y-2">
                    <p className="text-[8px] font-mono text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100 break-all">
                      ERRO PUSH: {debugLog}
                    </p>
                    <button 
                      onClick={async () => {
                        hasRequestedToken.current = false;
                        setPushStatus('IDLE');
                        // This manual click satisfies iOS user-gesture requirement
                        if (user && profile) {
                          try {
                            const permission = await Notification.requestPermission();
                            if (permission === 'granted') {
                              setPushStatus('PERMITTED');
                              if ('serviceWorker' in navigator) {
                                const reg = await navigator.serviceWorker.ready;
                                const token = await getToken(messaging!, {
                                  serviceWorkerRegistration: reg,
                                  vapidKey: 'BI7s--T3DUWgcemxMWHM286HMLVfZr2xPWUqU5NOoilYismCecx8T-pA_Ixs2SD6tQmeHBoocLyp_fFsc7YTpyY'
                                });
                                if (token) {
                                  await setDoc(doc(db, 'userTokens', user.uid), {
                                    token,
                                    platform: 'web',
                                    updatedAt: serverTimestamp(),
                                    specialties: profile.specialties || []
                                  }, { merge: true });
                                  setPushStatus('REGISTERED');
                                }
                              }
                            } else {
                              setPushStatus('ERROR');
                              setDebugLog('Permissão Negada (Ajustes do iPhone)');
                            }
                          } catch (err: any) {
                            setDebugLog(err.message);
                            setPushStatus('ERROR');
                          }
                        }
                      }}
                      className="w-full py-2 bg-brand/10 text-brand text-[9px] font-black rounded-lg hover:bg-brand/20 transition-all uppercase tracking-widest"
                    >
                      Solicitar Permissão Novamente
                    </button>
                    <p className="text-[7px] text-text-secondary text-center leading-tight px-2">
                      Dica: Se negou antes, vá em Ajustes &gt; Notificações &gt; SMS Service no seu iPhone e ative manualmente.
                    </p>
                  </div>
                )}
                {pushStatus === 'REGISTERED' && (
                  <div className="mt-2 space-y-2">
                    <p className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-center uppercase tracking-widest">
                      PWA NOTIFICADO ✓
                    </p>
                    <button 
                      onClick={async () => {
                        const loadingToast = document.createElement('div');
                        loadingToast.innerText = 'Enviando teste...';
                        loadingToast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold z-[100]';
                        document.body.appendChild(loadingToast);
                        
                        try {
                          const tokenDoc = await getDoc(doc(db, 'userTokens', user!.uid));
                          const token = tokenDoc.data()?.token;
                          
                          if (token) {
                            const res = await fetch('/api/test-push', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ token, title: 'TESTE DE CONEXÃO', message: 'Se você está lendo isso, a notificação funcionou!' })
                            });
                            if (res.ok) {
                              loadingToast.innerText = 'Teste disparado! Feche o app e aguarde.';
                              setTimeout(() => loadingToast.remove(), 4000);
                            } else {
                              throw new Error('Falha no servidor');
                            }
                          }
                        } catch (err) {
                           loadingToast.innerText = 'Erro ao enviar teste.';
                           setTimeout(() => loadingToast.remove(), 2000);
                        }
                      }}
                      className="w-full py-2 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-lg hover:bg-emerald-200 transition-all uppercase tracking-widest border border-emerald-200"
                    >
                      Enviar Notificação de Teste
                    </button>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <aside className="w-[220px] bg-white border-r border-border py-5 hidden md:flex flex-col flex-shrink-0">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-brand p-1.5 rounded-lg shadow-sm shadow-brand/20">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-[20px] font-black tracking-tighter text-brand">SMS SERVICE</h1>
          </div>
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest pl-1">Setor de Obras</p>
        </div>
        
        <nav className="flex-1">
          <ul className="space-y-1">
            <SidebarItem 
              icon={<Home className="w-4 h-4"/>} 
              label="Início / Dashboard" 
              active={currentPage === 'dashboard'} 
              onClick={() => handlePageChange('dashboard')}
            />
            <SidebarItem 
              icon={<ClipboardList className="w-4 h-4"/>} 
              label="Central de Chamados" 
              active={currentPage === 'services'} 
              onClick={() => handlePageChange('services')}
            />
            {isUserAdmin && (
              <SidebarItem 
                icon={<ShieldCheck className="w-4 h-4"/>} 
                label={`PORTAL: ${profile?.name?.split(' ')[0] || 'ADMIN'}`} 
                active={currentPage === 'admin'} 
                onClick={() => handlePageChange('admin')}
              />
            )}
            <SidebarItem 
              icon={<Building2 className="w-4 h-4"/>} 
              label="Rede de Saúde (SMS)" 
              active={currentPage === 'units'} 
              onClick={() => handlePageChange('units')}
            />
          </ul>
        </nav>

        <div className="px-5 mt-auto">
           {user ? (
             <button 
               onClick={handleLogout}
               className="w-full flex items-center justify-between p-4 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-all mb-4"
             >
                <div className="flex flex-col items-start overflow-hidden">
                   <span className="text-[11px] font-black text-text-primary truncate w-full">{profile?.name || user.displayName}</span>
                   <span className="text-[9px] font-bold text-text-secondary uppercase">
                     {isAdminEmail ? 'Administrador Geral' : profile?.status === 'Pendente' ? 'Aguardando Aprovação' : profile?.role || 'Acesso Limitado'}
                   </span>
                </div>
                <LogOut className="w-4 h-4 text-text-secondary" />
             </button>
           ) : (
             <button 
               onClick={handleLogin}
               className="w-full flex items-center justify-center gap-2 p-4 bg-brand text-white rounded-2xl hover:brightness-110 transition-all mb-4 font-black text-xs"
             >
                <LogIn className="w-4 h-4" /> ENTRAR NO SISTEMA
             </button>
           )}
          <div className="bg-brand/5 border border-brand/10 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5 text-brand" />
              <span className="text-[11px] font-bold text-brand uppercase">Rede Ativa</span>
            </div>
            <p className="text-[10px] text-text-secondary leading-tight">Prefeitura de Cuiabá - Saúde Municipal</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-text-primary leading-tight">
              {currentPage === 'dashboard' ? 'Painel de Controle de Obras' : 
               currentPage === 'services' ? 'Gestão de Ordens de Serviço' : 
               currentPage === 'admin' ? 'Portal Administrativo SMS' : 'Unidades de Saúde'}
            </h2>
            <p className="text-[12px] md:text-[13px] text-text-secondary font-medium mt-0.5">Secretaria Municipal de Saúde - Cuiabá/MT</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {isUserAdmin && currentPage === 'services' && (
              <button 
                onClick={() => { setEditingOrder(null); setIsAddModalOpen(true); }}
                className="bg-brand hover:brightness-111 text-white px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar Chamados
              </button>
            )}
            {isUserAdmin && currentPage !== 'services' && (
              <div className="hidden md:flex items-center gap-2 text-[11px] font-black text-brand bg-brand/5 px-4 py-2 rounded-xl">
                <Clock className="w-4 h-4" />
                DASHBOARD ATIVO
              </div>
            )}
            {!isUserAdmin && (
              <div className="hidden md:flex items-center gap-2 text-[11px] font-black text-warning bg-warning/10 px-4 py-2 rounded-xl">
                <ShieldCheck className="w-4 h-4" />
                RESTRITO PARA ADMIN
              </div>
            )}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsNotificationPanelOpen(true)}
                className="relative p-2.5 bg-white border border-border rounded-xl hover:bg-neutral-50 transition-all group"
              >
                <Bell className="w-5 h-5 text-text-secondary group-hover:text-brand" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              <div className="flex items-center gap-3 bg-white border border-border px-3 md:px-4 py-2 rounded-xl shadow-sm">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[12px] font-bold text-text-primary leading-none">
                  {isAdminEmail ? 'Gestor de Obras' : isUserApproved ? 'Técnico de Obras' : 'Visitante'}
                </span>
                <span className="text-[10px] font-semibold text-brand uppercase mt-1">
                  {isAdminEmail ? 'Aprovado' : profile?.status || 'Não Identificado'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-brand font-black text-sm border-2 border-brand/10">
                {user?.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
            </div>
          </div>
        </div>
      </header>

        {/* Notificações Panel */}
        <AnimatePresence>
          {isNotificationPanelOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNotificationPanelOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
              />
              <motion.aside 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white z-[70] shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Notification Panel Decorative Strip (Cuiabá Flag Colors) */}
                <div className="flex flex-col w-full shrink-0">
                  <div className="h-3 bg-white w-full" />
                  <div className="h-2 bg-[#FBD400] w-full" />
                  <div className="h-2 bg-[#00923F] w-full" />
                </div>

                <div className="p-6 border-b border-border flex items-center justify-between bg-neutral-50/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand/10 text-brand p-2 rounded-xl">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-brand">Avisos e Alertas</h3>
                      <p className="text-[10px] font-bold text-text-secondary uppercase">Fluxo de Comunicação SMS</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsNotificationPanelOpen(false)}
                    className="p-2 text-text-secondary hover:text-danger hover:bg-danger/5 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {notifications.length > 0 ? (
                    notifications.map((n) => {
                      const schemes: Record<string, string> = {
                        'ELÉTRICA': 'bg-sky-50/50 border-sky-100',
                        'HIDRAÚLICAS': 'bg-amber-50/50 border-amber-100',
                        'LIMPEZAS': 'bg-emerald-50/50 border-emerald-100',
                        'PINTURAS': 'bg-violet-50/50 border-violet-100',
                        'REFORMAS': 'bg-rose-50/50 border-rose-100',
                        'GERAL': 'bg-stone-100/50 border-stone-200',
                      };
                      const schemeClass = schemes[n.category] || 'bg-white border-border';

                      return (
                        <div 
                          key={n.id} 
                          className={`p-4 rounded-2xl border transition-all relative group ${schemeClass} ${
                            !n.read ? 'shadow-sm ring-1 ring-inset ring-brand/10' : 'opacity-70'
                          }`}
                        >
                          {!n.read && (
                            <div className="absolute top-4 right-4 w-2 h-2 bg-brand rounded-full"></div>
                          )}
                          <h4 className="font-black text-xs uppercase tracking-tight text-text-primary mb-1 pr-10">{n.title}</h4>
                          <p className="text-[12px] font-medium text-text-secondary leading-relaxed mb-3">{n.message}</p>
                          
                          <button 
                            onClick={() => deleteNotification(n.id)}
                            className="absolute top-3 right-3 p-1.5 text-text-secondary hover:text-danger hover:bg-danger/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            title="Remover este alerta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CategoryBadge category={n.category} />
                              <span className="text-[9px] font-bold text-text-secondary">
                                {n.createdAt?.toDate?.()?.toLocaleDateString() || 'Agora'}
                              </span>
                            </div>
                            {!n.read && (
                              <button 
                                onClick={() => markNotificationAsRead(n.id)}
                                className="text-[9px] font-black text-brand uppercase hover:underline"
                              >
                                Marcar como lida
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-text-secondary">
                      <div className="w-16 h-16 bg-neutral-100 rounded-[24px] flex items-center justify-center mb-4">
                        <Bell className="w-8 h-8 text-neutral-300" />
                      </div>
                      <p className="font-black uppercase text-[10px] tracking-widest leading-relaxed">Sua caixa de avisos está vazia no momento</p>
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-4 border-t border-border bg-neutral-50">
                    <button 
                      onClick={clearAllNotifications}
                      className="w-full bg-danger text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-danger/20 hover:brightness-110 transition-all"
                    >
                      Limpar todos os Alertas
                    </button>
                  </div>
                )}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Bloqueio se o usuário estiver logado mas Rejeitado ou sem Perfil. ADMIN ignora esse bloqueio. */}
        {user && !isAdminEmail && (!profile || profile.status === 'Rejeitado' || profile.status === 'Pendente') ? (
           <div className="flex-1 flex items-center justify-center p-6">
              {!profile ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl w-full bg-white p-10 rounded-[40px] border border-border shadow-2xl overflow-hidden relative"
                >
                   <div className="absolute top-0 left-0 w-full h-2 bg-brand"></div>
                   <div className="mb-8">
                     <h3 className="text-2xl font-black text-brand tracking-tighter">Concluir Cadastro</h3>
                     <p className="text-text-secondary font-bold text-sm">Preencha seus dados técnicos para solicitar acesso ao sistema SMS.</p>
                   </div>
                   
                   <form onSubmit={handleRegister} className="grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 pl-1">Nome Completo</label>
                        <div className="relative">
                           <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                           <input name="name" defaultValue={user.displayName || ''} required className="w-full bg-neutral-50 border-2 border-border rounded-xl pl-12 pr-4 py-3 font-bold focus:border-brand outline-none transition-all" />
                        </div>
                      </div>
                      
                      <div className="col-span-1">
                        <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 pl-1">Número de Matrícula</label>
                        <div className="relative">
                           <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                           <input name="matricula" placeholder="Ex: 88234-1" required className="w-full bg-neutral-50 border-2 border-border rounded-xl pl-12 pr-4 py-3 font-bold focus:border-brand outline-none transition-all" />
                        </div>
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 pl-1">CPF</label>
                        <div className="relative">
                           <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                           <input name="cpf" placeholder="000.000.000-00" required className="w-full bg-neutral-50 border-2 border-border rounded-xl pl-12 pr-4 py-3 font-bold focus:border-brand outline-none transition-all" />
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase text-text-secondary mb-3 pl-1">Funções Técnicas (Selecione uma ou mais)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                           {['ELÉTRICA', 'HIDRAÚLICAS', 'LIMPEZAS', 'PINTURAS', 'REFORMAS'].map(dept => (
                              <label key={dept} className="flex items-center gap-3 p-3 bg-neutral-50 border-2 border-border rounded-xl cursor-pointer hover:border-brand/50 transition-all group">
                                 <input type="checkbox" name="specialties" value={dept} className="w-5 h-5 rounded border-2 border-border text-brand focus:ring-brand" />
                                 <span className="text-[11px] font-bold text-text-secondary group-hover:text-brand transition-colors">{dept}</span>
                              </label>
                           ))}
                        </div>
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 pl-1">Telefone / WhatsApp</label>
                        <div className="relative">
                           <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                           <input name="phone" placeholder="(65) 9 9999-9999" required className="w-full bg-neutral-50 border-2 border-border rounded-xl pl-12 pr-4 py-3 font-bold focus:border-brand outline-none transition-all" />
                        </div>
                      </div>

                      <div className="col-span-2 pt-4">
                         <button type="submit" className="w-full bg-brand text-white py-4 rounded-xl font-black shadow-lg shadow-brand/20 hover:scale-[1.02] transition-all uppercase text-sm">
                            Solicitar Acesso à Gerência
                         </button>
                      </div>
                   </form>
                </motion.div>
              ) : profile.status === 'Pendente' ? (
                <div className="max-w-md text-center bg-white p-12 rounded-[40px] border border-border shadow-xl">
                   <Clock className="w-16 h-16 text-warning mx-auto mb-6 animate-pulse" />
                   <h3 className="text-2xl font-black text-text-primary mb-4">Cadastro em Análise</h3>
                   <p className="text-text-secondary font-bold mb-8">Olá {profile.name}, sua matrícula ({profile.matricula}) e funções ({(profile.specialties || []).join(', ')}) foram enviadas. Aguarde a aprovação do Administrador.</p>
                   <button onClick={handleLogout} className="text-sm font-bold text-brand hover:underline">Sair do Sistema</button>
                </div>
              ) : (
                <div className="max-w-md text-center bg-white p-12 rounded-[40px] border border-border shadow-xl">
                   <AlertTriangle className="w-16 h-16 text-danger mx-auto mb-6" />
                   <h3 className="text-2xl font-black text-text-primary mb-4">Acesso Negado</h3>
                   <p className="text-text-secondary font-bold">Infelizmente seu acesso foi recusado pela administração. Entre em contato com o setor de obras.</p>
                </div>
              )}
           </div>
        ) : (
          <>
            {currentPage === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard 
                    label="Total de Solicitações" 
                    value={stats.totalOrders} 
                    color="border-l-brand" 
                    icon={ClipboardList}
                    onClick={() => {
                      setFilter('Todos');
                      setCurrentPage('services');
                    }}
                  />
                  <StatCard 
                    label="Aguardando Recebimento" 
                    value={stats.awaitingOrders} 
                    color="border-l-warning" 
                    icon={Clock}
                    onClick={() => {
                      setFilter('Aguardando recebimento');
                      setCurrentPage('services');
                    }}
                  />
                  <StatCard 
                    label="Equipes em Campo" 
                    value={stats.inProgressOrders} 
                    color="border-l-success" 
                    icon={Activity}
                    onClick={() => {
                      setFilter('EM ANDAMENTO');
                      setCurrentPage('services');
                    }}
                  />
                  <StatCard 
                    label="Obras Concluídas" 
                    value={stats.completedOrders} 
                    color="border-l-brand" 
                    icon={Check}
                    onClick={() => {
                      setFilter('CONCLUIDO');
                      setCurrentPage('services');
                    }}
                  />
                  <StatCard 
                    label="Demandas Atrasadas" 
                    value={stats.delayedOrders} 
                    color="border-l-danger" 
                    icon={AlertTriangle}
                    onClick={() => {
                      setFilter('ATRASADO');
                      setCurrentPage('services');
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Lista Recente */}
                    <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col min-h-0 overflow-hidden">
                      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-black text-[11px] uppercase tracking-wider flex items-center gap-2 text-brand">
                          <Activity className="w-4 h-4" />
                          Demandas Recentes
                        </h3>
                        <button 
                          onClick={() => setCurrentPage('services')}
                          className="text-[10px] font-black text-brand uppercase hover:underline"
                        >
                          Gerenciar Tudo
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[12px]">
                          <thead>
                            <tr className="bg-neutral-50/50">
                              <th className="px-6 py-3 font-bold text-text-secondary uppercase tracking-wider text-[10px]">Local</th>
                              <th className="px-6 py-3 font-bold text-text-secondary uppercase tracking-wider text-[10px]">Prioridade</th>
                              <th className="px-6 py-3 font-bold text-text-secondary uppercase tracking-wider text-[10px]">Status</th>
                              {isUserApproved && <th className="px-6 py-3 font-bold text-brand uppercase tracking-wider text-[10px] text-right">Ação Rápida</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {processedServices.filter(s => s.status !== 'CONCLUIDO').length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-10 text-center">
                                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-[2px]">Tudo em dia! Sem demandas urgentes no momento.</p>
                                </td>
                              </tr>
                            ) : (
                              processedServices
                                .filter(s => s.status !== 'CONCLUIDO')
                                .slice(0, 5)
                                .map((s) => (
                                  <tr key={s.id} className="hover:bg-neutral-50/50 transition-colors">
                                  <td className="px-6 py-4 font-bold uppercase truncate max-w-[120px]">{s.unitName}</td>
                                  <td className="px-6 py-4">
                                    <PriorityBadge priority={s.priority} />
                                  </td>
                                  <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                                  {isUserApproved && (
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {s.status !== 'EM ANDAMENTO' && (
                                          <button
                                            onClick={() => updateOrderStatus(s.id, 'EM ANDAMENTO')}
                                            className="p-1.5 bg-brand text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all"
                                            title="Encaminhar"
                                          >
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => updateOrderStatus(s.id, 'CONCLUIDO')}
                                          className="p-1.5 bg-success text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all"
                                          title="Concluir"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Resumo por Categoria (Apenas se Admin ou Visitante) */}
                    {isUserAdmin && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {(['ELÉTRICA', 'HIDRAÚLICAS', 'LIMPEZAS', 'PINTURAS', 'REFORMAS'] as Department[]).map(cat => (
                          <div key={cat} className="bg-white p-4 rounded-xl border border-border flex flex-col items-center text-center">
                            <span className="text-[9px] font-black text-text-secondary uppercase mb-1">{cat}</span>
                            <span className="text-xl font-black text-brand">
                              {processedServices.filter(s => s.category === cat).length}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="bg-brand text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[240px]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                      <div className="relative z-10">
                        <AlertTriangle className="w-8 h-8 text-accent mb-4" />
                        <h3 className="text-xl font-black mb-2 leading-tight uppercase tracking-tighter">Painel Operacional</h3>
                        {user ? (
                          <p className="text-sm text-white/80 mb-6 font-medium">
                            Você está visualizando a rede ativa de {(profile?.specialties || []).join(', ') || 'Administração'}. 
                            {(!isUserApproved && !isAdminEmail) ? ' Aguarde aprovação do seu cadastro.' : ' Gerencie as demandas pelo menu de serviços.'}
                          </p>
                        ) : (
                          <p className="text-sm text-white/80 mb-6 font-medium italic">Modo de Transparência Público: Visualização de todas as demandas municipais em tempo real.</p>
                        )}
                        
                        {!user && (
                            <div className="space-y-4">
                              <button 
                                onClick={handleLogin}
                                className="bg-accent text-brand w-full py-3 rounded-xl font-black text-sm shadow-lg hover:brightness-110 transition-all uppercase tracking-tight"
                              >
                                Entrar como Funcionário
                              </button>

                              <button 
                                onClick={handleInstallApp}
                                className="w-full flex items-center justify-center gap-3 p-3 bg-emerald-500 text-white rounded-xl font-black text-[11px] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all border-2 border-emerald-400/30"
                              >
                                <DownloadIcon className="w-4 h-4" />
                                {isInstalled ? 'ABRIR TUTORIAL DE USO' : 'BAIXAR APLICATIVO DIRETO'}
                              </button>
                              
                              <p className="text-[10px] text-white/40 text-center font-bold">
                                {deferredPrompt ? '✅ Pronto para Instalar' : '⏳ Aguardando Navegador...'}
                              </p>
                            </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                       <h4 className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-4">Ação Rápida</h4>
                       <div className="space-y-2">
                          <button 
                             onClick={handleInstallApp}
                             className="w-full p-4 bg-gradient-to-r from-brand to-brand-dark text-white rounded-2xl shadow-xl shadow-brand/20 flex items-center gap-4 group hover:scale-[1.02] transition-all border border-white/10 mb-2"
                          >
                             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                                <DownloadIcon className="w-5 h-5 text-white" />
                             </div>
                             <div className="text-left">
                                <p className="text-[11px] font-black uppercase tracking-wider">Baixar Aplicativo</p>
                                <p className="text-[10px] opacity-80 font-bold">Instale agora para receber alertas na barra do celular</p>
                             </div>
                          </button>
                          <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl mb-1">
                             <p className="text-[10px] font-black text-brand uppercase mb-1">Dica de Notificação</p>
                             <p className="text-[10px] text-text-secondary leading-tight font-bold">
                                No Chrome, clique nos 3 pontos e <span className="text-brand">"Instalar Aplicativo"</span> para receber alertas na barra do celular.
                             </p>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                             <span className="text-[12px] font-bold">Suporte Técnico</span>
                             <button className="text-brand font-black text-[10px] uppercase">Chamado TI</button>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                             <span className="text-[12px] font-bold">Base de Conhecimento</span>
                             <button className="text-brand font-black text-[10px] uppercase">Manuais</button>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </>
            )}

                    {currentPage === 'admin' && isUserAdmin && (
                       <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-border">
                             {(['Geral', 'Funcionários', 'Unidades', 'Relatórios'] as const).map((tab) => (
                                <button 
                                   key={tab}
                                   className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${filter === tab ? 'bg-brand text-white' : 'text-text-secondary hover:bg-neutral-100'}`}
                                   onClick={() => setFilter(tab as any)}
                                >
                                   {tab}
                                </button>
                             ))}
                          </div>

                          <div className="flex-1 overflow-auto space-y-6 pr-2">
                             {(filter === 'Todos' || filter === 'Geral') && (
                                <div className="grid grid-cols-1 gap-6">
                                   <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden p-8">
                                      <div className="flex items-center gap-3 mb-6">
                                         <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                                            <MessageSquare className="w-5 h-5" />
                                         </div>
                                         <div>
                                            <h3 className="font-black text-sm uppercase tracking-tighter text-brand leading-none">Rádio do Administrador</h3>
                                            <p className="text-[10px] font-bold text-text-secondary uppercase mt-1">Enviar notificações direcionadas por equipe</p>
                                         </div>
                                      </div>

                                      <form onSubmit={sendAdminMessage} className="space-y-4">
                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-1">
                                               <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 pl-1 tracking-widest">Enviar para Equipe de:</label>
                                               <select name="category" required className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 font-bold text-sm focus:border-brand outline-none transition-all cursor-pointer">
                                                  <option value="GERAL">📢 TODAS AS EQUIPES</option>
                                                  <option value="ELÉTRICA">ELÉTRICA</option>
                                                  <option value="HIDRAÚLICAS">HIDRAÚLICAS</option>
                                                  <option value="LIMPEZAS">LIMPEZAS</option>
                                                  <option value="PINTURAS">PINTURAS</option>
                                                  <option value="REFORMAS">REFORMAS</option>
                                               </select>
                                            </div>
                                            <div className="md:col-span-2">
                                               <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 pl-1 tracking-widest">Sua Mensagem / Aviso:</label>
                                               <div className="relative">
                                                  <input 
                                                     name="message" 
                                                     required 
                                                     placeholder="Ex: FAVOR DAR ATENÇÃO PARA A DEMANDA NUMERO 024584/2026..." 
                                                     className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 pr-16 font-bold text-sm focus:border-brand outline-none transition-all"
                                                  />
                                                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand text-white p-2 rounded-lg hover:scale-110 active:scale-95 transition-all">
                                                     <Send className="w-4 h-4" />
                                                  </button>
                                               </div>
                                            </div>
                                         </div>
                                         <p className="text-[9px] font-bold text-warning uppercase bg-warning/5 p-2 rounded-lg text-center border border-warning/10">Este aviso aparecerá instantaneamente na tela dos técnicos da categoria selecionada.</p>
                                      </form>
                                   </div>
                                </div>
                             )}

                             {(filter === 'Todos' || filter === 'Funcionários') && (
                                <div className="space-y-6">
                                   <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden">
                                      <div className="px-8 py-5 border-b border-border bg-neutral-50/50 flex items-center justify-between">
                                         <h3 className="font-black text-[11px] uppercase tracking-widest text-brand">Aguardando Aprovação</h3>
                                         <span className="text-[10px] font-black bg-warning/20 text-warning px-3 py-1 rounded-full">{allUsers.filter(u => u.status === 'Pendente').length} PENDENTES</span>
                                      </div>
                                      <table className="w-full text-left border-collapse text-[13px]">
                                        <thead>
                                          <tr className="bg-neutral-50/30">
                                            <th className="px-8 py-4 font-black text-text-secondary uppercase text-[10px]">Funcionário</th>
                                            <th className="px-8 py-4 font-black text-text-secondary uppercase text-[10px]">Especialidade</th>
                                            <th className="px-8 py-4 font-black text-text-secondary uppercase text-[10px] text-right">Decisão</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                          {allUsers.filter(u => u.status === 'Pendente').map((u) => (
                                            <tr key={u.uid} className="hover:bg-neutral-50/20 transition-colors">
                                              <td className="px-8 py-4">
                                                 <div className="flex flex-col">
                                                    <span className="font-bold text-text-primary uppercase tracking-tight">{u.name}</span>
                                                    <span className="text-[10px] text-text-secondary">Mat: {u.matricula} | CPF: {u.cpf}</span>
                                                 </div>
                                              </td>
                                              <td className="px-8 py-4">
                                                 <div className="flex flex-wrap gap-1">{(u.specialties || []).map(s => (<span key={s} className="px-2 py-0.5 bg-accent/30 text-brand rounded text-[9px] font-black uppercase">{s}</span>))}</div>
                                              </td>
                                              <td className="px-8 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                   <button onClick={() => deleteUser(u.uid, u.name)} className="p-2 text-text-secondary hover:text-danger hover:bg-danger/5 rounded-lg transition-all" title="Excluir Solicitação">
                                                      <Trash2 className="w-4 h-4" />
                                                   </button>
                                                   <button onClick={() => updateUserStatus(u.uid, 'Aprovado')} className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-success/20 hover:scale-105 transition-all">
                                                      <Check className="w-3.5 h-3.5" /> Aprovar
                                                   </button>
                                                   <button onClick={() => updateUserStatus(u.uid, 'Rejeitado')} className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-danger/20 hover:scale-105 transition-all">
                                                      <X className="w-3.5 h-3.5" /> Recusar
                                                   </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                          {allUsers.filter(u => u.status === 'Pendente').length === 0 && (
                                            <tr><td colSpan={3} className="px-8 py-10 text-center text-text-secondary font-bold text-sm italic">Nenhum novo registro aguardando análise no momento.</td></tr>
                                          )}
                                        </tbody>
                                      </table>
                                   </div>

                                   <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden opacity-80">
                                      <div className="px-8 py-5 border-b border-border bg-neutral-50/50 flex items-center justify-between">
                                         <h3 className="font-black text-[11px] uppercase tracking-widest text-text-secondary">Corpo Técnico Ativo (Aprovados)</h3>
                                         <span className="text-[10px] font-black bg-success/10 text-success px-3 py-1 rounded-full">{allUsers.filter(u => u.status === 'Aprovado').length} ATIVOS</span>
                                      </div>
                                      <table className="w-full text-left border-collapse text-[13px]">
                                        <tbody className="divide-y divide-border">
                                          {allUsers.filter(u => u.status === 'Aprovado').map((u) => (
                                            <tr key={u.uid} className="hover:bg-neutral-50/20 transition-colors">
                                              <td className="px-8 py-4">
                                                 <div className="flex flex-col">
                                                    <span className="font-bold text-text-primary uppercase tracking-tight">{u.name} {u.email === ADMIN_EMAIL && '(VOCÊ)'}</span>
                                                    <span className="text-[10px] text-text-secondary">{u.email}</span>
                                                 </div>
                                              </td>
                                              <td className="px-8 py-4">
                                                 <div className="flex flex-wrap gap-1">{(u.specialties || []).map(s => (<span key={s} className="px-2 py-0.5 bg-neutral-100 text-text-secondary rounded text-[9px] font-black uppercase">{s}</span>))}</div>
                                              </td>
                                              <td className="px-8 py-4 text-right">
                                                 <span className="text-success font-black text-[10px] uppercase flex items-center justify-end gap-1">
                                                    <div className="flex items-center justify-end gap-3">
                                                       <button 
                                                         onClick={async (e) => {
                                                           e.stopPropagation();
                                                           const tokenDoc = await getDoc(doc(db, 'userTokens', u.uid));
                                                           const token = tokenDoc.data()?.token;
                                                           if (token) {
                                                             const res = await fetch('/api/test-push', {
                                                               method: 'POST',
                                                               headers: { 'Content-Type': 'application/json' },
                                                               body: JSON.stringify({ 
                                                                 token, 
                                                                 title: 'SMS SERVICE - TESTE', 
                                                                 message: `Sinal de push ok para: ${u.name}` 
                                                               })
                                                             });
                                                             if (res.ok) alert('✅ SINAL ENVIADO! Verifique o celular de ' + u.name);
                                                             else {
                                                               const errorData = await res.json();
                                                               alert('❌ ERRO: ' + (errorData.error || 'Erro desconhecido no servidor'));
                                                             }
                                                           } else {
                                                             alert('⚠️ SEM REGISTRO: Este funcionário ainda não ativou as notificações no celular.');
                                                           }
                                                         }}
                                                         className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-lg font-black text-[10px] uppercase shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all" 
                                                         title="Testar Notificação no Celular"
                                                       >
                                                          <BellRing className="w-3.5 h-3.5" />
                                                          Testar Celular
                                                       </button>

                                                       <button onClick={() => { setEditingUser(u); setIsEditUserModalOpen(true); }} className="p-2 text-brand hover:bg-brand/5 rounded-lg transition-all flex items-center gap-2 group">
                                                          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                                                          <span className="text-[10px] font-black uppercase">Editar</span>
                                                       </button>
                                                       <span className="text-success font-black text-[10px] uppercase flex items-center justify-end gap-1"><ShieldCheck className="w-3 h-3" /> ATIVO</span>
                                                       {u.email !== ADMIN_EMAIL && (<button onClick={() => deleteUser(u.uid, u.name)} className="p-2 text-danger hover:bg-danger/5 rounded-lg ml-2 group" title="Excluir Colaborador"><Trash2 className="w-4 h-4 inline" /><span className="text-[10px] font-black uppercase ml-1">Excluir</span></button>)}
                                                    </div>
                                                 </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                   </div>

                                   {/* SEÇÃO DE ACESSOS NEGADOS */}
                                   <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden mt-6">
                                      <div className="px-8 py-5 border-b border-border bg-danger/[0.03] flex items-center justify-between">
                                         <h3 className="font-black text-[11px] uppercase tracking-widest text-danger">Acessos Negados / Rejeitados</h3>
                                         <span className="text-[10px] font-black bg-danger/10 text-danger px-3 py-1 rounded-full">{allUsers.filter(u => u.status === 'Rejeitado').length} REJEITADOS</span>
                                      </div>
                                      <div className="overflow-x-auto">
                                         <table className="w-full text-left border-collapse text-[13px]">
                                           <thead>
                                             <tr className="bg-neutral-50/10">
                                               <th className="px-8 py-4 font-black text-text-secondary uppercase text-[10px]">Funcionário</th>
                                               <th className="px-8 py-4 font-black text-text-secondary uppercase text-[10px]">Status</th>
                                               <th className="px-8 py-4 font-black text-text-secondary uppercase text-[10px] text-right">Ação Corretiva</th>
                                             </tr>
                                           </thead>
                                           <tbody className="divide-y divide-border">
                                             {allUsers.filter(u => u.status === 'Rejeitado').map((u) => (
                                               <tr key={u.uid} className="hover:bg-danger/[0.02] transition-colors">
                                                 <td className="px-8 py-4">
                                                    <div className="flex flex-col">
                                                       <span className="font-bold text-text-primary uppercase tracking-tight">{u.name}</span>
                                                       <span className="text-[10px] text-text-secondary">{u.email}</span>
                                                    </div>
                                                 </td>
                                                 <td className="px-8 py-4">
                                                    <span className="px-3 py-1 bg-danger/10 text-danger rounded-full text-[9px] font-black uppercase flex items-center gap-1 w-fit">
                                                       <XCircle className="w-3 h-3" /> ACESSO REJEITADO
                                                    </span>
                                                 </td>
                                                 <td className="px-8 py-4 text-right">
                                                    <button 
                                                       onClick={() => deleteUser(u.uid, u.name)} 
                                                       className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-brand hover:text-white text-brand rounded-xl font-black text-[10px] uppercase transition-all shadow-sm border border-brand/10"
                                                    >
                                                       <RotateCcw className="w-3 h-3" /> Limpar e Permitir Novo Cadastro
                                                    </button>
                                                 </td>
                                               </tr>
                                             ))}
                                             {allUsers.filter(u => u.status === 'Rejeitado').length === 0 && (
                                               <tr><td colSpan={3} className="px-8 py-10 text-center text-text-secondary font-bold text-sm italic">Nenhum cadastro rejeitado encontrado.</td></tr>
                                             )}
                                           </tbody>
                                         </table>
                                      </div>
                                   </div>
                                </div>
                             )}

                     {(filter === 'Todos' || filter === 'Geral' || filter === 'Unidades') && (
                        <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden">
                           <div className="px-8 py-5 border-b border-border bg-neutral-50/50 flex items-center justify-between">
                              <h3 className="font-black text-[11px] uppercase tracking-widest text-brand">Configuração da Rede SMS (Unidades)</h3>
                           </div>
                           <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Formulário de Unidade */}
                              <div className="bg-neutral-50 p-6 rounded-3xl border border-border">
                                 <h4 className="text-[11px] font-black uppercase text-brand mb-4 tracking-widest underline decoration-brand/30 underline-offset-4">Cadastrar / Editar Unidade</h4>
                                 <form onSubmit={handleUnitSubmit} className="space-y-4">
                                    <input type="hidden" name="unitId" />
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="col-span-2">
                                          <label className="block text-[9px] font-black uppercase text-text-secondary mb-1 ml-1">Nome da Unidade de Saúde</label>
                                          <input name="name" required placeholder="Ex: UPA Morada do Ouro" className="w-full bg-white border border-border px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-brand transition-all" />
                                       </div>
                                       <div className="col-span-1">
                                          <label className="block text-[9px] font-black uppercase text-text-secondary mb-1 ml-1">Região de Cuiabá</label>
                                          <select name="region" className="w-full bg-white border border-border px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-brand cursor-pointer">
                                             <option value="NORTE">NORTE</option>
                                             <option value="SUL">SUL</option>
                                             <option value="LESTE">LESTE</option>
                                             <option value="OESTE">OESTE</option>
                                             <option value="CENTRO">CENTRO</option>
                                          </select>
                                       </div>
                                       <div className="col-span-1">
                                          <label className="block text-[9px] font-black uppercase text-text-secondary mb-1 ml-1">Bairro</label>
                                          <input name="bairro" placeholder="Ex: Morada do Ouro" className="w-full bg-white border border-border px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-brand transition-all" />
                                       </div>
                                       <div className="col-span-1">
                                          <label className="block text-[9px] font-black uppercase text-text-secondary mb-1 ml-1">Tipo</label>
                                          <select name="type" className="w-full bg-white border border-border px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-brand cursor-pointer">
                                             <option value="HOSPITAL">HOSPITAL</option>
                                             <option value="UPA">UPA</option>
                                             <option value="UBS">UBS</option>
                                             <option value="PSF">PSF</option>
                                             <option value="ADMIN">ADMIN</option>
                                          </select>
                                       </div>
                                       <div className="col-span-1">
                                          <label className="block text-[9px] font-black uppercase text-text-secondary mb-1 ml-1">Telefone Unidade/Coord.</label>
                                          <input name="coordinatorPhone" placeholder="(65) 0000-0000" className="w-full bg-white border border-border px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-brand transition-all" />
                                       </div>
                                       <div className="col-span-2">
                                          <label className="block text-[9px] font-black uppercase text-text-secondary mb-1 ml-1">Endereço Completo / Localização</label>
                                          <input name="address" required placeholder="Rua, Número, Referência" className="w-full bg-white border border-border px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-brand transition-all" />
                                       </div>
                                       <div className="col-span-2">
                                          <label className="block text-[9px] font-black uppercase text-text-secondary mb-1 ml-1">Nome do Coordenador(a)</label>
                                          <input name="coordinator" placeholder="Ex: Dra. Maria Silva" className="w-full bg-white border border-border px-4 py-3 rounded-xl text-sm font-bold outline-none focus:border-brand transition-all" />
                                       </div>
                                    </div>
                                    <div className="flex gap-2">
                                       <button type="submit" className="flex-1 bg-brand text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-brand/20 hover:scale-[1.01] transition-all">
                                          <Save className="w-4 h-4 inline-block mr-2" /> Salvar Unidade na Rede
                                       </button>
                                       <button 
                                         type="button" 
                                         onClick={(e) => {
                                           const form = e.currentTarget.closest('form') as HTMLFormElement;
                                           if (form) {
                                             form.reset();
                                             const idInput = form.querySelector('[name="unitId"]') as HTMLInputElement;
                                             if (idInput) idInput.value = '';
                                           }
                                         }}
                                         className="px-6 bg-neutral-200 text-text-secondary py-4 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-neutral-300 transition-all font-mono"
                                         title="Limpar / Cancelar Edição"
                                       >
                                         X
                                       </button>
                                    </div>
                                 </form>
                              </div>

                              {/* Lista de Unidades Existentes */}
                              <div className="space-y-4">
                                 <h4 className="text-[11px] font-black uppercase text-brand mb-4 tracking-widest">Unidades Registradas ({(allUnits.length > 0 ? allUnits : MOCK_UNITS).length})</h4>
                                 <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
                                    {(allUnits.length > 0 ? allUnits : MOCK_UNITS).map(unit => (
                                       <div key={unit.id} className="bg-white p-4 rounded-2xl border border-border flex items-center justify-between group">
                                          <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-brand">
                                                <Building2 className="w-5 h-5" />
                                             </div>
                                             <div>
                                                <h5 className="font-black text-[13px] uppercase tracking-tight text-text-primary leading-none mb-1">{unit.name}</h5>
                                                <p className="text-[10px] text-text-secondary font-bold truncate max-w-[200px]">{unit.region} - {unit.bairro || unit.address}</p>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button 
                                                onClick={() => {
                                                   const form = document.querySelector('form') as HTMLFormElement;
                                                   if (form) {
                                                      const idInput = form.querySelector('[name="unitId"]') as HTMLInputElement;
                                                      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
                                                      const typeInput = form.querySelector('[name="type"]') as HTMLSelectElement;
                                                      const regionInput = form.querySelector('[name="region"]') as HTMLSelectElement;
                                                      const bairroInput = form.querySelector('[name="bairro"]') as HTMLInputElement;
                                                      const addrInput = form.querySelector('[name="address"]') as HTMLInputElement;
                                                      const coordInput = form.querySelector('[name="coordinator"]') as HTMLInputElement;
                                                      const phoneInput = form.querySelector('[name="coordinatorPhone"]') as HTMLInputElement;
                                                      
                                                      if (idInput) idInput.value = unit.id;
                                                      if (nameInput) nameInput.value = unit.name;
                                                      if (typeInput) typeInput.value = unit.type;
                                                      if (regionInput) regionInput.value = unit.region || 'NORTE';
                                                      if (bairroInput) bairroInput.value = unit.bairro || '';
                                                      if (addrInput) addrInput.value = unit.address;
                                                      if (coordInput) coordInput.value = unit.coordinator || '';
                                                      if (phoneInput) phoneInput.value = unit.coordinatorPhone || '';
                                                   }
                                                }}
                                                className="p-2 text-brand hover:bg-accent/20 rounded-lg transition-all"
                                             >
                                                <History className="w-4 h-4" />
                                             </button>
                                             {unit.id.length > 5 && (
                                                <button onClick={() => deleteUnit(unit.id)} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-all">
                                                   <Trash2 className="w-4 h-4" />
                                                </button>
                                             )}
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {filter === 'Relatórios' && (
                        <div className="space-y-6">
                           {/* Filtros de Relatórios */}
                           <div className="bg-white p-6 rounded-3xl border border-border shadow-sm flex flex-wrap items-end gap-4">
                              <div className="flex-1 min-w-[200px]">
                                 <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 pl-1">Unidade de Saúde</label>
                                 <select 
                                    value={reportUnitId} 
                                    onChange={(e) => setReportUnitId(e.target.value)}
                                    className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 font-bold text-sm focus:border-brand outline-none transition-all cursor-pointer"
                                 >
                                    <option value="all">🏢 TODAS AS UNIDADES</option>
                                    {(allUnits.length > 0 ? allUnits : MOCK_UNITS).map(u => (
                                       <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                 </select>
                              </div>
                              <div className="w-40">
                                 <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 pl-1">Competência (Mês)</label>
                                 <select 
                                    value={reportMonth} 
                                    onChange={(e) => setReportMonth(parseInt(e.target.value))}
                                    className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 font-bold text-sm focus:border-brand outline-none transition-all cursor-pointer"
                                 >
                                    {MONTHS.map((m, i) => (
                                       <option key={m} value={i}>{m.toUpperCase()}</option>
                                    ))}
                                 </select>
                              </div>
                              <div className="w-32">
                                 <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 pl-1">Ano</label>
                                 <select 
                                    value={reportYear} 
                                    onChange={(e) => setReportYear(parseInt(e.target.value))}
                                    className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 font-bold text-sm focus:border-brand outline-none transition-all cursor-pointer"
                                 >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                       <option key={y} value={y}>{y}</option>
                                    ))}
                                 </select>
                              </div>
                              <button 
                                 onClick={() => window.print()} 
                                 className="bg-neutral-800 text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-neutral-800/10"
                              >
                                 <Save className="w-4 h-4" /> Exportar PDF
                              </button>
                           </div>

                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Texto e Sumário */}
                              <div className="lg:col-span-1 space-y-6">
                                 <div className="bg-brand text-white p-8 rounded-[32px] shadow-xl shadow-brand/20 relative overflow-hidden">
                                    <div className="relative z-10">
                                       <h4 className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Resumo Executivo</h4>
                                       <h3 className="text-3xl font-black leading-tight mb-4 tracking-tighter">
                                          {reportUnitId === 'all' ? 'TODA A REDE' : (allUnits.length > 0 ? allUnits : MOCK_UNITS).find(u => u.id === reportUnitId)?.name}
                                       </h3>
                                       <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur">
                                          <p className="text-xs font-bold leading-relaxed">
                                             RELATÓRIO: Mês {MONTHS[reportMonth]} {reportYear}, foram realizados {reportData.total} chamados de manutenção.
                                          </p>
                                          {reportData.breakdown.length > 0 && (
                                             <p className="text-xs font-medium opacity-90 mt-2 leading-relaxed italic">
                                                Sendo elas {reportData.breakdown.map((b) => `${b.percentage.toFixed(0)}% ${b.name}`).join(', ').replace(/, ([^,]*)$/, ' e $1')}.
                                             </p>
                                          )}
                                       </div>
                                       <div className="mt-6 flex items-center gap-4">
                                          <div className="bg-white/20 p-3 rounded-xl">
                                             <BarChart3 className="w-5 h-5" />
                                          </div>
                                          <div>
                                             <p className="text-[9px] font-black uppercase opacity-60">Status do Período</p>
                                             <p className="text-sm font-black">{reportData.total > 0 ? 'DADOS ATIVOS' : 'SEM REGISTROS'}</p>
                                          </div>
                                       </div>
                                    </div>
                                    <Building2 className="absolute top-4 right-4 w-24 h-24 opacity-10 -rotate-12" />
                                 </div>

                                 <div className="bg-white p-6 rounded-3xl border border-border shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-brand mb-4 flex items-center gap-2">
                                       <Activity className="w-4 h-4" /> Distribuição de Serviços
                                    </h4>
                                    <div className="space-y-4">
                                       {reportData.breakdown.map((b, i) => (
                                          <div key={b.name} className="space-y-1.5">
                                             <div className="flex justify-between text-[10px] font-black uppercase">
                                                <span className="text-text-secondary">{b.name}</span>
                                                <span className="text-brand">{b.value}</span>
                                             </div>
                                             <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                                <div 
                                                   style={{ width: `${b.percentage}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} 
                                                   className="h-full rounded-full transition-all duration-1000"
                                                />
                                             </div>
                                          </div>
                                       ))}
                                       {reportData.total === 0 && (
                                          <p className="text-center py-4 text-[10px] font-bold text-text-secondary uppercase">Aguardando dados...</p>
                                       )}
                                    </div>
                                 </div>
                              </div>

                              {/* Gráficos Visuais */}
                              <div className="lg:col-span-2 grid grid-cols-1 gap-6">
                                 <div className="bg-white p-8 rounded-[32px] border border-border shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                                    <h4 className="text-[10px] font-black uppercase text-text-secondary mb-8 tracking-widest w-full text-left">Visão Geral de Categorias (%)</h4>
                                    {reportData.total > 0 ? (
                                       <div className="w-full h-80">
                                          <ResponsiveContainer width="100%" height="100%">
                                             <PieChart>
                                                <Pie
                                                   data={reportData.breakdown}
                                                   innerRadius={80}
                                                   outerRadius={120}
                                                   paddingAngle={5}
                                                   dataKey="value"
                                                >
                                                   {reportData.breakdown.map((entry, index) => (
                                                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                   ))}
                                                </Pie>
                                                <Tooltip 
                                                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                                />
                                                <Legend />
                                             </PieChart>
                                          </ResponsiveContainer>
                                       </div>
                                    ) : (
                                       <div className="flex flex-col items-center opacity-30">
                                          <PieChartIcon className="w-16 h-16 mb-4" />
                                          <p className="font-black text-xs uppercase tracking-widest text-center">Nenhum dado encontrado para<br/>este filtro de competência.</p>
                                       </div>
                                    )}
                                 </div>

                                 <div className="bg-white p-8 rounded-[32px] border border-border shadow-sm flex flex-col min-h-[300px]">
                                    <h4 className="text-[10px] font-black uppercase text-text-secondary mb-8 tracking-widest">Fluxo de Manutenção (Volume Diário)</h4>
                                    <div className="w-full h-48">
                                       <ResponsiveContainer width="100%" height="100%">
                                          <BarChart data={reportData.daily}>
                                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                             <XAxis 
                                                dataKey="day" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fontSize: 9, fontWeight: 700, fill: '#6B7280' }} 
                                             />
                                             <YAxis 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fontSize: 9, fontWeight: 700, fill: '#6B7280' }} 
                                             />
                                             <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                                labelFormatter={(val) => `Dia ${val}`}
                                             />
                                             <Bar dataKey="count" fill="#16ae8a" radius={[4, 4, 0, 0]} barSize={12} />
                                          </BarChart>
                                       </ResponsiveContainer>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {currentPage === 'services' && (
              <div className="bg-surface rounded-2xl border border-border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <h3 className="text-sm font-black text-brand uppercase tracking-wider">Histórico de Chamados</h3>
                      <p className="text-[11px] text-text-secondary font-bold">Todos os registros das Unidades de Saúde</p>
                    </div>
                    <div className="w-px h-8 bg-border hidden md:block mx-2"></div>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary" />
                      <input 
                        type="text" 
                        placeholder="Buscar por unidade, título ou ID..." 
                        className="bg-neutral-50 border border-border outline-none text-[13px] pl-10 pr-4 py-2 rounded-xl w-64 focus:border-brand transition-colors font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
                      {([
                        { key: 'Todos', label: 'Todos' },
                        { key: 'Aguardando recebimento', label: 'Pendente' },
                        { key: 'EM ANDAMENTO', label: 'Em Execução' },
                        { key: 'CONCLUIDO', label: 'Realizados' },
                        { key: 'ATRASADO', label: 'Atrasado' },
                      ] as const).map(({ key, label }) => {
                        const count = key === 'Todos' 
                          ? processedServices.length 
                          : processedServices.filter(item => item.status === key).length;
                        return (
                          <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 ${
                              filter === key 
                                ? 'bg-white text-brand shadow-sm' 
                                : 'text-text-secondary hover:bg-white/50'
                            }`}
                          >
                            <span>{label}</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                              filter === key ? 'bg-brand/10 text-brand' : 'bg-neutral-200 text-text-secondary'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Menu de Equipes */}
                <div className="px-6 py-3 border-b border-border bg-neutral-50/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5 mr-1">
                    <HardHat className="w-3.5 h-3.5" /> Equipe:
                  </span>
                  {(['Todas', 'ELÉTRICA', 'HIDRAÚLICAS', 'LIMPEZAS', 'PINTURAS', 'REFORMAS'] as const).map((team) => {
                    const teamCount = team === 'Todas'
                      ? filteredServices.length
                      : filteredServices.filter(s => s.category === team).length;
                    const colors: Record<string, string> = {
                      'ELÉTRICA':    'bg-sky-50 text-sky-700 border-sky-200',
                      'HIDRAÚLICAS': 'bg-blue-50 text-blue-700 border-blue-200',
                      'LIMPEZAS':    'bg-teal-50 text-teal-700 border-teal-200',
                      'PINTURAS':    'bg-purple-50 text-purple-700 border-purple-200',
                      'REFORMAS':    'bg-orange-50 text-orange-700 border-orange-200',
                      'Todas':       'bg-white text-text-primary border-border',
                    };
                    const activeColors: Record<string, string> = {
                      'ELÉTRICA':    'bg-sky-600 text-white border-sky-600',
                      'HIDRAÚLICAS': 'bg-blue-600 text-white border-blue-600',
                      'LIMPEZAS':    'bg-teal-600 text-white border-teal-600',
                      'PINTURAS':    'bg-purple-600 text-white border-purple-600',
                      'REFORMAS':    'bg-orange-600 text-white border-orange-600',
                      'Todas':       'bg-brand text-white border-brand',
                    };
                    const isActive = teamFilter === team;
                    return (
                      <button
                        key={team}
                        onClick={() => setTeamFilter(team)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase border transition-all whitespace-nowrap ${isActive ? activeColors[team] : colors[team]}`}
                      >
                        {team}
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-black/10">
                          {teamCount}
                        </span>
                      </button>
                    );
                  })}
                  {teamFilter !== 'Todas' && (
                    <button
                      onClick={() => setTeamFilter('Todas')}
                      className="ml-auto flex items-center gap-1 text-[10px] font-black text-text-secondary hover:text-danger transition-colors uppercase"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Limpar
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-x-auto border border-border rounded-3xl bg-white shadow-sm">
                  <div className="min-w-[800px]">
                    <table className="w-full text-left border-collapse text-[13px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#fcfcfd]">
                        <th className="px-6 py-4 font-black text-text-secondary uppercase border-b border-border tracking-wider text-[11px]">SIGED</th>
                        <th className="px-6 py-4 font-black text-text-secondary uppercase border-b border-border tracking-wider text-[11px]">Unidade de Saúde</th>
                        <th className="px-6 py-4 font-black text-text-secondary uppercase border-b border-border tracking-wider text-[11px]">Descrição da Demanda</th>
                        <th className="px-6 py-4 font-black text-text-secondary uppercase border-b border-border tracking-wider text-[11px]">Situação</th>
                        <th className="px-6 py-4 font-black text-text-secondary uppercase border-b border-border tracking-wider text-[11px]">Prioridade</th>
                        <th className="px-6 py-4 font-black text-text-secondary uppercase border-b border-border tracking-wider text-[11px] text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <AnimatePresence mode="popLayout">
                        {filteredServices.map((service) => (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key={service.id} 
                            className="hover:bg-neutral-50/50 transition-colors group"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono font-bold text-[12px] text-text-primary">{(service as any).siged || '—'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-black text-text-primary uppercase tracking-tight text-[12px]">{service.unitName}</span>
                                <span className="text-[10px] text-brand/70 font-bold">{service.requester}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 max-w-md">
                              <div className="flex flex-col">
                                <span className="font-bold text-text-primary leading-snug">{service.title}</span>
                                <span className="text-[11px] text-text-secondary line-clamp-1 opacity-80 mb-2">{service.description}</span>
                                {service.status === 'CONCLUIDO' && service.completionReport && (
                                  <div className="p-3 bg-success/5 border-l-2 border-success rounded-lg text-[11px]">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <Check className="w-3 h-3 text-success" />
                                        <span className="font-black text-success uppercase text-[9px]">RELATÓRIO TÉCNICO</span>
                                      </div>
                                      {(service as any).photos?.length > 0 && (
                                        <button onClick={() => { setViewingPhotos((service as any).photos); setViewingPhotoIdx(0); }}
                                          className="flex items-center gap-1 bg-success text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-success/80 transition-colors">
                                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                          Ver {(service as any).photos.length} foto(s)
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-text-primary font-medium italic leading-relaxed mb-2">"{service.completionReport}"</p>
                                    {(service as any).photos?.length > 0 && (
                                      <div className="flex gap-1.5 flex-wrap mt-1 mb-2">
                                        {(service as any).photos.slice(0,4).map((url: string, idx: number) => (
                                          <img key={idx} src={url} alt={`foto ${idx+1}`}
                                            className="w-10 h-10 object-cover rounded-lg border border-success/30 cursor-pointer hover:scale-110 transition-transform"
                                            onClick={() => { setViewingPhotos((service as any).photos); setViewingPhotoIdx(idx); }} />
                                        ))}
                                        {(service as any).photos.length > 4 && (
                                          <button onClick={() => { setViewingPhotos((service as any).photos); setViewingPhotoIdx(0); }}
                                            className="w-10 h-10 bg-success/10 border border-success/30 rounded-lg flex items-center justify-center text-success font-black text-[9px] hover:bg-success/20">
                                            +{(service as any).photos.length - 4}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between text-[9px] font-bold text-text-secondary border-t border-success/10 pt-1.5">
                                      <span>RESP: {service.technicianName}</span>
                                      {service.completedAt && (
                                        <span>FINALIZADO: {new Date((service.completedAt as any).seconds * 1000).toLocaleDateString()}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={service.status} />
                            </td>
                            <td className="px-6 py-4">
                              <PriorityBadge priority={service.priority} />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isUserAdmin && (
                                  <>
                                    <button 
                                      onClick={() => { setEditingOrder(service); setIsAddModalOpen(true); }}
                                      className="p-2 text-text-secondary hover:bg-neutral-100 rounded-xl transition-all"
                                      title="Editar"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteOrder(service.id, service.title)}
                                      className="p-2 text-danger hover:bg-red-50 rounded-xl transition-all"
                                      title="Excluir chamado"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                 {/* Ações Rápidas por Botões */}
                                 {service.status !== 'CONCLUIDO' ? (
                                   <div className="flex items-center gap-1.5">
                                     {/* Se estiver aguardando ou atrasado, mostra ENCAMINHAR */}
                                     {service.status !== 'EM ANDAMENTO' && (
                                       <button
                                         disabled={!isUserApproved}
                                         onClick={() => updateOrderStatus(service.id, 'EM ANDAMENTO')}
                                         className={`group/btn flex items-center gap-1.5 bg-brand text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm hover:bg-brand/90 hover:scale-105 active:scale-95 transition-all ${
                                           !isUserApproved ? 'opacity-50 grayscale cursor-not-allowed' : ''
                                         }`}
                                         title="Encaminhar para execução"
                                       >
                                         <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                         Encaminhar
                                       </button>
                                     )}
                                     
                                     {/* Botão CONCLUIR sempre visível para chamados ativos */}
                                     <button
                                       disabled={!isUserApproved}
                                       onClick={() => updateOrderStatus(service.id, 'CONCLUIDO')}
                                       className={`group/btn flex items-center gap-1.5 bg-success text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm hover:bg-success/90 hover:scale-105 active:scale-95 transition-all ${
                                         !isUserApproved ? 'opacity-50 grayscale cursor-not-allowed' : ''
                                       }`}
                                       title="Finalizar serviço e gerar relatório"
                                     >
                                       <Check className="w-3.5 h-3.5" />
                                       Concluir
                                     </button>
                                   </div>
                                 ) : (
                                   /* Se estiver concluído e for Admin, permite REABRIR */
                                   isUserAdmin && (
                                     <button
                                       onClick={() => updateOrderStatus(service.id, 'EM ANDAMENTO')}
                                       className="flex items-center gap-1.5 bg-neutral-100 text-text-secondary px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-neutral-200 hover:text-text-primary transition-all shadow-sm"
                                       title="Reabrir chamado para manutenção"
                                     >
                                       <RotateCcw className="w-3.5 h-3.5" />
                                       Reabrir
                                     </button>
                                   )
                                 )}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                  {filteredServices.length === 0 && (
                    <div className="py-24 text-center flex flex-col items-center justify-center">
                      <div className="bg-neutral-50 w-24 h-24 rounded-[40px] flex items-center justify-center mb-6 shadow-inner">
                        {searchTerm !== '' || filter !== 'Todos' ? (
                          <Search className="w-10 h-10 text-neutral-300" />
                        ) : (
                          <ClipboardList className="w-10 h-10 text-brand opacity-20" />
                        )}
                      </div>
                      <h4 className="text-lg font-black text-brand uppercase tracking-tighter mb-2">
                        {searchTerm !== '' || filter !== 'Todos' ? 'Nenhum resultado' : 'Tudo Limpo por Aqui'}
                      </h4>
                      <p className="text-text-secondary font-bold text-xs uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed mb-8">
                        {searchTerm !== '' || filter !== 'Todos' 
                          ? 'Ajuste seus filtros ou termo de busca para encontrar o que procura.' 
                          : 'Não há demandas ativas no momento. Que tal cadastrar um novo chamado agora?'}
                      </p>
                      {processedServices.length === 0 && isUserAdmin && (
                        <button 
                          onClick={() => { setEditingOrder(null); setIsAddModalOpen(true); }}
                          className="bg-brand text-white px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          <Plus className="w-4 h-4 inline-block mr-2" /> Cadastrar Primeira Demanda
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="px-6 py-3 bg-neutral-50/50 border-t border-border flex items-center justify-between text-[11px] font-bold text-text-secondary">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                      <span className="uppercase tracking-tighter">Sistema de Monitoramento em Tempo Real - SMS</span>
                   </div>
                   <span className="uppercase">Cuiabá - Mato Grosso</span>
                </div>
              </div>
            )}
            {currentPage === 'units' && (
              <div className="flex-1 flex flex-col gap-6">
                {!selectedUnitId ? (
                  <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-border bg-neutral-50/50 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-brand uppercase tracking-tighter">Rede de Unidades SMS</h3>
                        <p className="text-[11px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Gestão de Infraestrutura Municipal</p>
                      </div>
                      <div className="bg-brand/10 text-brand px-4 py-2 rounded-2xl flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span className="text-[12px] font-black uppercase">{(allUnits.length > 0 ? allUnits : MOCK_UNITS).length} Unidades</span>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-border overflow-y-auto">
                      {(allUnits.length > 0 ? allUnits : MOCK_UNITS).map(unit => {
                        const unitOrders = processedServices.filter(s => s.unitId === unit.id);
                        const activeOrders = unitOrders.filter(s => s.status !== 'CONCLUIDO');
                        
                        return (
                          <motion.div 
                            key={unit.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => setSelectedUnitId(unit.id)}
                            className="px-8 py-5 hover:bg-neutral-50 transition-all cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-text-secondary group-hover:bg-brand/10 group-hover:text-brand transition-all">
                                <Hospital className="w-6 h-6" />
                              </div>
                              <div className="flex flex-col">
                                <h4 className="font-black text-text-primary uppercase text-sm tracking-tight group-hover:text-brand transition-colors">{unit.name}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] font-black uppercase text-text-secondary bg-neutral-100 px-2 py-0.5 rounded-md">{unit.type}</span>
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-text-secondary">
                                    <MapPin className="w-3 h-3" />
                                    <span className="line-clamp-1 max-w-[200px]">{unit.address}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-8">
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-text-secondary uppercase">Chamados GERAIS</span>
                                <span className="text-lg font-black text-text-primary">{unitOrders.length}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-brand uppercase">Pendentes</span>
                                <span className={`text-lg font-black ${activeOrders.length > 0 ? 'text-brand' : 'text-success'}`}>{activeOrders.length}</span>
                              </div>
                              <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-brand transition-all group-hover:translate-x-1" />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-6">
                    {(() => {
                      const unit = (allUnits.length > 0 ? allUnits : MOCK_UNITS).find(u => u.id === selectedUnitId);
                      if (!unit) return null;
                      
                      const unitOrders = processedServices
                        .filter(s => s.unitId === selectedUnitId)
                        .sort((a, b) => {
                          const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any).toDate?.().getTime() || 0) : 0;
                          const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any).toDate?.().getTime() || 0) : 0;
                          return dateB - dateA; // Newest on top
                        });

                      const categories: Department[] = ['ELÉTRICA', 'HIDRAÚLICAS', 'LIMPEZAS', 'PINTURAS', 'REFORMAS'];
                      const catCounts = categories.map(cat => ({
                        cat,
                        count: unitOrders.filter(s => s.category === cat).length
                      }));
                      const maxCount = Math.max(...catCounts.map(c => c.count), 1);

                      return (
                        <>
                          {/* Unit Header */}
                          <div className="bg-white p-8 rounded-[32px] border border-border shadow-md flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/[0.02] rounded-full -mr-32 -mt-32"></div>
                            <div className="flex items-center gap-6 relative z-10 w-full md:w-auto text-center md:text-left flex-col md:flex-row">
                              <button 
                                onClick={() => setSelectedUnitId(null)}
                                className="p-4 bg-neutral-100 rounded-2xl text-text-secondary hover:bg-brand/10 hover:text-brand transition-all group"
                              >
                                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                              </button>
                              <div>
                                <h3 className="text-2xl font-black text-brand uppercase tracking-tighter leading-none mb-2">{unit.name}</h3>
                                <div className="flex items-center gap-4 text-text-secondary font-bold text-sm justify-center md:justify-start">
                                  <span className="bg-brand/5 text-brand px-3 py-1 rounded-full text-[10px] font-black uppercase">{unit.type}</span>
                                  <div className="flex items-center gap-1.5 opacity-70">
                                    <MapPin className="w-4 h-4 text-brand" />
                                    {unit.address}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Mini Category Chart */}
                            <div className="bg-neutral-50 p-6 rounded-3xl border border-border flex flex-col gap-4 min-w-[300px] relative z-10">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase text-text-secondary">Resumo de Demandas</span>
                                <span className="text-[10px] font-black text-brand bg-brand/10 px-2 py-0.5 rounded uppercase">{unitOrders.length} Total</span>
                              </div>
                              <div className="flex flex-col gap-2.5">
                                {catCounts.map(item => (
                                  <div key={item.cat} className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-black uppercase text-text-secondary">
                                      <span>{item.cat}</span>
                                      <span className={item.count > 0 ? "text-brand" : "opacity-30"}>{item.count}</span>
                                    </div>
                                    <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(item.count / maxCount) * 100}%` }}
                                        className={`h-full rounded-full transition-all ${item.count > 0 ? 'bg-brand shadow-[0_0_8px_rgba(22,174,138,0.3)]' : 'bg-transparent'}`}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Unit Orders List */}
                          <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden flex flex-col">
                            <div className="px-8 py-5 border-b border-border bg-neutral-50/50 flex items-center justify-between">
                              <h4 className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Cronologia de Serviços</h4>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success"></div>
                                <span className="text-[10px] font-bold text-text-secondary uppercase">Ordenado por mais recentes</span>
                              </div>
                            </div>
                            <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
                              {unitOrders.length > 0 ? (
                                unitOrders.map(order => (
                                  <div key={order.id} className="p-6 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-5 flex-1">
                                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-text-secondary">
                                        <ClipboardList className="w-5 h-5" />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                          <span className="font-mono text-[10px] font-black text-text-secondary">#{order.id.replace('OS-', '')}</span>
                                          <h5 className="font-black text-text-primary uppercase text-xs tracking-tight">{order.title}</h5>
                                          <StatusBadge status={order.status} />
                                        </div>
                                        <p className="text-[12px] text-text-secondary font-medium line-clamp-1">{order.description}</p>
                                        <div className="flex items-center gap-4 mt-1">
                                          <span className="text-[9px] font-black bg-neutral-100 text-text-secondary px-2 py-0.5 rounded uppercase tracking-tighter">{order.category}</span>
                                          <div className="flex items-center gap-1 text-[9px] font-bold text-text-secondary opacity-60">
                                            <CalendarIcon className="w-3 h-3" />
                                            {order.createdAt ? (typeof order.createdAt === 'string' ? new Date(order.createdAt).toLocaleDateString() : (order.createdAt as any).toDate?.().toLocaleDateString()) : '---'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <PriorityBadge priority={order.priority} />
                                  </div>
                                ))
                              ) : (
                                <div className="py-20 text-center">
                                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-border">
                                    <HardHat className="w-8 h-8 text-neutral-200" />
                                  </div>
                                  <p className="text-text-secondary font-black uppercase text-[10px] tracking-widest">Sem chamados registrados para esta unidade</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {/* Expansão Header Footer */}
                {!selectedUnitId && (
                  <div className="bg-brand text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden mt-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                       <div className="text-center md:text-left">
                          <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter leading-none">Monitoramento Federado</h3>
                          <p className="text-white/80 font-bold text-sm">Visualização consolidada de infraestrutura SMS Cuiabá.</p>
                       </div>
                       <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black uppercase bg-white/10 px-3 py-1 rounded-lg">Cuiabá - Mato Grosso</span>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal Edição de Usuário (Admin) */}
      <AnimatePresence>
        {isEditUserModalOpen && editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand/80 backdrop-blur-md" onClick={() => setIsEditUserModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-border flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-brand uppercase tracking-tighter">Gerenciar Colaborador</h3>
                  <p className="text-xs font-bold text-text-secondary uppercase">Ajuste de funções e credenciais técnicas</p>
                </div>
                <button onClick={() => setIsEditUserModalOpen(false)} className="p-3 bg-neutral-100 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all"><X /></button>
              </div>
              <form onSubmit={saveUserEdit} className="p-8 space-y-6 overflow-y-auto no-scrollbar flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 ml-1">Nome Completo</label>
                    <input name="name" defaultValue={editingUser.name} required className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 font-bold focus:border-brand outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 ml-1">Matrícula</label>
                    <input name="matricula" defaultValue={editingUser.matricula} required className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 font-bold focus:border-brand outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 ml-1">CPF</label>
                    <input name="cpf" defaultValue={editingUser.cpf} required className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 font-bold focus:border-brand outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 ml-1">Funções SMS (Multi-Seleção)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {['ELÉTRICA', 'HIDRAÚLICAS', 'LIMPEZAS', 'PINTURAS', 'REFORMAS'].map(dept => (
                        <label key={dept} className="flex items-center gap-2 p-2 bg-neutral-50 border border-border rounded-lg cursor-pointer hover:bg-brand/5">
                          <input type="checkbox" name="specialties" value={dept} defaultChecked={(editingUser.specialties || []).includes(dept as any)} className="rounded text-brand" />
                          <span className="text-[10px] font-bold">{dept}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 ml-1">E-mail (Login)</label>
                    <input value={editingUser.email} disabled className="w-full bg-neutral-100 border-2 border-border rounded-xl px-4 py-3 font-bold text-text-secondary outline-none cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 ml-1">Telefone / WhatsApp</label>
                    <input name="phone" defaultValue={editingUser.phone} required className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 font-bold focus:border-brand outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 ml-1">Nível de Acesso</label>
                    <select name="role" defaultValue={editingUser.role} className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 font-bold focus:border-brand outline-none cursor-pointer">
                      <option value="FUNCIONARIO">FUNCIONÁRIO</option>
                      <option value="ADMIN">ADMINISTRADOR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 ml-1">Status da Conta</label>
                    <select name="status" defaultValue={editingUser.status} className="w-full bg-neutral-50 border-2 border-border rounded-xl px-4 py-3 font-bold focus:border-brand outline-none cursor-pointer">
                      <option value="Aprovado">APROVADO</option>
                      <option value="Pendente">PENDENTE</option>
                      <option value="Rejeitado">REJEITADO</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:scale-[1.02] transition-all">Salvar Alterações</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chamado Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand/80 backdrop-blur-md"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-2xl border border-brand/20 flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-8 md:p-10 border-b border-border flex items-center justify-between shrink-0 bg-white z-10">
                <div>
                  <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-brand">
                    {editingOrder ? 'Editar Lançamento do Chamado' : 'Abertura de Chamado Técnico'}
                  </h3>
                  <p className="text-text-secondary font-bold text-[11px] md:text-sm">
                    {editingOrder ? `Corrigindo erro no registro #${editingOrder.id.replace('OS-', '')}` : 'Registro exclusivo para Administradores de Obras'}
                  </p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="bg-neutral-100 hover:bg-rose-50 hover:text-rose-500 w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0">
                  <X />
                </button>
              </div>
              
              <form onSubmit={createOrder} className="flex-1 flex flex-col min-h-0">
                <div className="p-8 md:p-10 space-y-8 overflow-y-auto no-scrollbar flex-1">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-black uppercase tracking-[2px] text-text-secondary mb-3 pl-1">Unidade de Saúde</label>
                      <select 
                        name="unitId"
                        required
                        defaultValue={editingOrder?.unitId || ''}
                        className="w-full bg-neutral-50 border-2 border-border rounded-2xl px-5 py-4 text-[15px] font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Selecione a Unidade...</option>
                        {(allUnits.length > 0 ? allUnits : MOCK_UNITS).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[11px] font-black uppercase tracking-[2px] text-text-secondary mb-3 pl-1">Tipo de Serviço</label>
                      <select 
                        name="category"
                        required
                        defaultValue={editingOrder?.category || 'ELÉTRICA'}
                        className="w-full bg-neutral-50 border-2 border-border rounded-2xl px-5 py-4 text-[15px] font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="ELÉTRICA">ELÉTRICA</option>
                        <option value="HIDRAÚLICAS">HIDRAÚLICAS</option>
                        <option value="LIMPEZAS">LIMPEZAS</option>
                        <option value="PINTURAS">PINTURAS</option>
                        <option value="REFORMAS">REFORMAS</option>
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[11px] font-black uppercase tracking-[2px] text-text-secondary mb-3 pl-1">Prioridade</label>
                      <select name="priority" defaultValue={editingOrder?.priority || 'Média'} className="w-full bg-neutral-50 border-2 border-border rounded-2xl px-5 py-4 text-[15px] font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all cursor-pointer">
                        <option value="Baixa">Baixa</option>
                        <option value="Média">Média</option>
                        <option value="Alta">Alta</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-[11px] font-black uppercase tracking-[2px] text-text-secondary mb-3 pl-1">
                        Número SIGED
                        <span className="ml-2 text-[9px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full normal-case">Número do sistema oficial da prefeitura</span>
                      </label>
                      <input name="siged" defaultValue={(editingOrder as any)?.siged || ''} placeholder="Ex: 123321/2026" className="w-full bg-neutral-50 border-2 border-border rounded-2xl px-6 py-4 text-[15px] font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-mono tracking-widest" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-black uppercase tracking-[2px] text-text-secondary mb-3 pl-1">Título do Chamado</label>
                      <input name="title" required defaultValue={editingOrder?.title || ''} placeholder="Ex: Manutenção Elétrica Preventiva" className="w-full bg-neutral-50 border-2 border-border rounded-2xl px-6 py-4 text-[15px] font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-black uppercase tracking-[2px] text-text-secondary mb-3 pl-1">Responsável pela Abertura (Admin)</label>
                      <input name="requester" required defaultValue={editingOrder?.requester || profile?.name || ''} className="w-full bg-neutral-50 border-2 border-border rounded-2xl px-6 py-4 text-[15px] font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-black uppercase tracking-[2px] text-text-secondary mb-3 pl-1">Fluxo Inicial do Chamado</label>
                      <div className="flex gap-4">
                        <label className="flex-1 cursor-pointer group">
                          <input type="radio" name="initialStatus" value="Aguardando recebimento" defaultChecked className="sr-only peer" />
                          <div className="p-4 rounded-2xl border-2 border-border bg-neutral-50 peer-checked:border-brand peer-checked:bg-brand/5 transition-all text-center group-hover:bg-brand/5">
                            <span className="block text-[10px] font-black uppercase tracking-tighter text-text-secondary peer-checked:text-brand">Aguardar</span>
                            <span className="block text-[8px] font-bold text-text-secondary opacity-60">Triagem Inicial</span>
                          </div>
                        </label>
                        <label className="flex-1 cursor-pointer group">
                          <input type="radio" name="initialStatus" value="EM ANDAMENTO" className="sr-only peer" />
                          <div className="p-4 rounded-2xl border-2 border-border bg-neutral-50 peer-checked:border-brand peer-checked:bg-brand/5 transition-all text-center group-hover:bg-brand/5">
                            <span className="block text-[10px] font-black uppercase tracking-tighter text-text-secondary peer-checked:text-brand">Encaminhar</span>
                            <span className="block text-[8px] font-bold text-text-secondary opacity-60">Enviar p/ Campo</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-black uppercase tracking-[2px] text-text-secondary mb-3 pl-1">Detalhamento Técnico</label>
                      <textarea name="description" rows={3} defaultValue={editingOrder?.description || ''} placeholder="Descreva os detalhes da manutenção necessária..." className="w-full bg-neutral-50 border-2 border-border rounded-2xl px-6 py-4 text-[15px] font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all resize-none"></textarea>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-10 border-t border-border bg-neutral-50/50 flex gap-6 shrink-0">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-8 py-5 rounded-2xl font-black text-text-secondary hover:bg-neutral-100 transition-colors uppercase text-sm select-none border-2 border-border/50">VOLTAR</button>
                  <button type="submit" className="flex-1 bg-brand text-white px-8 py-5 rounded-2xl font-black transition-all shadow-xl shadow-brand/20 hover:scale-[1.02] uppercase text-sm border-b-4 border-black/20">
                    {editingOrder ? 'SALVAR ALTERAÇÕES' : 'CRIAR CHAMADO'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Relatório de Conclusão Modal */}
      <AnimatePresence>
        {isCompletionModalOpen && orderToComplete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsCompletionModalOpen(false); setSelectedPhotos([]); setPhotosPreviews([]); }} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg border border-border flex flex-col overflow-hidden max-h-[90vh]">
              <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-success/10 p-2 rounded-xl text-success"><Check className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-xl font-black tracking-tighter text-text-primary uppercase">Finalizar Serviço</h3>
                    <p className="text-text-secondary font-bold text-xs">{orderToComplete.unitName}</p>
                  </div>
                </div>
                <button onClick={() => { setIsCompletionModalOpen(false); setSelectedPhotos([]); setPhotosPreviews([]); }} className="text-text-secondary hover:text-danger p-1"><X /></button>
              </div>
              <form onSubmit={handleCompleteOrder} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 tracking-widest">O que foi realizado?</label>
                  <textarea name="completionReport" required rows={3} placeholder="Descreva as peças trocadas, reparos feitos e o estado final do local..." className="w-full bg-neutral-50 border-2 border-border rounded-xl px-5 py-4 text-sm font-bold focus:border-brand outline-none resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-text-secondary mb-2 tracking-widest">
                    Fotos do Serviço <span className="text-danger ml-1">* obrigatório</span>
                    {selectedPhotos.length > 0 && <span className="text-brand ml-1">({selectedPhotos.length} foto{selectedPhotos.length > 1 ? 's' : ''})</span>}
                  </label>
                  <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all ${selectedPhotos.length === 0 ? 'border-danger/50 bg-red-50 hover:bg-red-100' : 'border-brand bg-brand/5 hover:bg-brand/10'}`}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={selectedPhotos.length === 0 ? '#ef4444' : '#16ae8a'} strokeWidth="2" className="mb-1"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span className={`text-[11px] font-black ${selectedPhotos.length === 0 ? 'text-danger' : 'text-brand'}`}>{selectedPhotos.length === 0 ? '⚠️ Adicione pelo menos 1 foto' : '+ Adicionar mais fotos'}</span>
                    <span className="text-[10px] text-text-secondary mt-0.5">JPG, PNG, HEIC • Sem limite</span>
                    <input type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                  {photosPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {photosPreviews.map((preview, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          <img src={preview} alt={`foto ${idx+1}`} className="w-full h-full object-cover rounded-xl border border-border" />
                          <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-black">×</button>
                          <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1 rounded">{idx+1}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-4 pt-2">
                  <button type="button" onClick={() => { setIsCompletionModalOpen(false); setSelectedPhotos([]); setPhotosPreviews([]); }} className="flex-1 py-4 rounded-xl font-black text-text-secondary hover:bg-neutral-100 uppercase text-xs border-2 border-border">CANCELAR</button>
                  <button type="submit" disabled={uploadingPhotos} className="flex-1 bg-brand text-white py-4 rounded-xl font-black shadow-lg hover:scale-[1.02] uppercase text-xs border-b-4 border-black/20 disabled:opacity-70 disabled:scale-100">
                    {uploadingPhotos ? '⏳ ENVIANDO...' : 'CONFIRMAR E FINALIZAR'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notificação Mobile-Style */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            onClick={() => {
               if (activeNotification.orderId) {
                  setCurrentPage('services');
                  setSearchTerm(activeNotification.orderId);
               }
               setActiveNotification(null);
            }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md bg-white rounded-3xl shadow-2xl border-2 border-brand/20 p-5 flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20">
               <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 overflow-hidden">
               <div className="flex items-center gap-2 mb-1">
                  <CategoryBadge category={activeNotification.category} />
                  <h4 className="text-[13px] font-black text-text-primary uppercase tracking-tight truncate">{activeNotification.title}</h4>
               </div>
               <p className="text-[12px] font-bold text-text-secondary truncate">{activeNotification.message}</p>
               <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-black text-brand animate-pulse">TOQUE PARA VER DETALHES</span>
               </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setActiveNotification(null); }} className="text-text-secondary hover:text-danger">
               <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal Galeria de Fotos */}
      <AnimatePresence>
        {viewingPhotos && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
            onClick={() => setViewingPhotos(null)}
          >
            <div className="flex items-center justify-between px-6 py-4 shrink-0" onClick={e => e.stopPropagation()}>
              <div>
                <h3 className="text-white font-black text-lg uppercase">Fotos do Serviço</h3>
                <p className="text-white/50 text-xs">{viewingPhotoIdx + 1} de {viewingPhotos.length} foto(s)</p>
              </div>
              <div className="flex items-center gap-3">
                <a href={viewingPhotos[viewingPhotoIdx]} download target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-black uppercase"
                  onClick={e => e.stopPropagation()}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Baixar
                </a>
                <button onClick={() => setViewingPhotos(null)} className="w-10 h-10 bg-white/10 hover:bg-danger text-white rounded-xl flex items-center justify-center transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center px-16 relative" onClick={e => e.stopPropagation()}>
              {viewingPhotoIdx > 0 && (
                <button onClick={() => setViewingPhotoIdx(i => i - 1)} className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center z-10">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              <img src={viewingPhotos[viewingPhotoIdx]} alt={`Foto ${viewingPhotoIdx + 1}`} className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl" style={{ maxHeight: 'calc(100vh - 180px)' }} />
              {viewingPhotoIdx < viewingPhotos.length - 1 && (
                <button onClick={() => setViewingPhotoIdx(i => i + 1)} className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center z-10">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}
            </div>
            <div className="flex gap-2 px-6 py-4 overflow-x-auto shrink-0" onClick={e => e.stopPropagation()}>
              {viewingPhotos.map((url, idx) => (
                <img key={idx} src={url} alt={`min ${idx+1}`} onClick={() => setViewingPhotoIdx(idx)}
                  className={`w-16 h-16 object-cover rounded-xl cursor-pointer shrink-0 transition-all ${idx === viewingPhotoIdx ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-80'}`} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <li>
      <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-6 py-3 text-[12px] font-bold transition-all uppercase tracking-tight text-left ${
          active ? 'bg-accent text-brand border-r-4 border-brand shadow-sm' : 'text-text-secondary hover:bg-brand/5 hover:text-brand'
        }`}
      >
        <span className={active ? 'text-brand' : 'text-text-secondary'}>{icon}</span>
        {label}
      </button>
    </li>
  );
}

function StatCard({ label, value, color, icon: Icon, onClick }: { label: string, value: string | number, color: string, icon: any, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`bg-white p-4 rounded-2xl border-l-[5px] border border-border shadow-sm flex items-center justify-between hover:translate-x-1 hover:shadow-md transition-all group w-full text-left cursor-pointer ${color}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-text-secondary group-hover:bg-brand/10 group-hover:text-brand transition-all">
          <Icon className="w-5 h-5 opacity-40 group-hover:opacity-100" />
        </div>
        <div>
          <p className="text-[9px] font-black text-text-secondary uppercase tracking-[1px]">{label}</p>
          <h4 className="text-[20px] font-black text-text-primary tracking-tighter leading-none mt-0.5">{value}</h4>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-neutral-200 group-hover:text-brand transition-all mr-1" />
    </button>
  );
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const styles: Record<ServiceStatus, string> = {
    'Aguardando recebimento': 'bg-warning-bg text-warning border-warning/20 border',
    'EM ANDAMENTO': 'bg-brand/10 text-brand border-brand/20 border',
    'CONCLUIDO': 'bg-success-bg text-success border-success/20 border',
    'ATRASADO': 'bg-danger-bg text-danger border-danger/30 border animate-pulse shadow-sm shadow-danger/10',
  };
  return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${styles[status]}`}>{status}</span>;
}

function CategoryBadge({ category }: { category: Department | 'GERAL' }) {
  const schemes: Record<Department | 'GERAL', string> = {
    'ELÉTRICA': 'bg-sky-50 text-sky-700 border-sky-100',
    'HIDRAÚLICAS': 'bg-amber-50 text-amber-700 border-amber-100',
    'LIMPEZAS': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'PINTURAS': 'bg-violet-50 text-violet-700 border-violet-100',
    'REFORMAS': 'bg-rose-50 text-rose-700 border-rose-100',
    'GERAL': 'bg-stone-100 text-stone-700 border-stone-200', // Marrom Leve (Tan)
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border tracking-widest ${schemes[category] || 'bg-neutral-50 text-neutral-600 border-neutral-100'}`}>
      {category}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const colors: Record<Priority, string> = {
    'Urgente': 'text-rose-600 bg-rose-50',
    'Alta': 'text-amber-600 bg-amber-50',
    'Média': 'text-brand bg-brand/5',
    'Baixa': 'text-emerald-600 bg-emerald-50',
  };
  return <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${colors[priority]}`}>{priority}</span>;
}
