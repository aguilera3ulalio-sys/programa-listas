import{BrowserRouter,Routes,Route,Navigate}from'react-router-dom'
import{AuthProvider,useAuth}from'./context/AuthContext'
import LoginPage from'./pages/LoginPage'
import DashboardPage from'./pages/DashboardPage'
import ClassView from'./pages/ClassView'
import RasgosPage from'./pages/RasgosPage'
import PeriosPage from'./pages/PeriosPage'
import CalendarPage from'./pages/CalendarPage'
import PendingPage from'./pages/PendingPage'
import SettingsPage from'./pages/SettingsPage'
const P=({c})=>{const{user}=useAuth();return user?c:<Navigate to="/login" replace/>}
const Q=({c})=>{const{user}=useAuth();return!user?c:<Navigate to="/" replace/>}
export default function App(){return(
<AuthProvider><BrowserRouter><Routes>
  <Route path="/login" element={<Q c={<LoginPage/>}/>}/>
  <Route path="/" element={<P c={<DashboardPage/>}/>}/>
  <Route path="/clase/:id" element={<P c={<ClassView/>}/>}/>
  <Route path="/clase/:id/rasgos" element={<P c={<RasgosPage/>}/>}/>
  <Route path="/clase/:id/periodos" element={<P c={<PeriosPage/>}/>}/>
  <Route path="/calendario" element={<P c={<CalendarPage/>}/>}/>
  <Route path="/pendientes" element={<P c={<PendingPage/>}/>}/>
  <Route path="/ajustes" element={<P c={<SettingsPage/>}/>}/>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></BrowserRouter></AuthProvider>
)}
