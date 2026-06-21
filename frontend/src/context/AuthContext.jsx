import{createContext,useContext,useState,useEffect}from'react'
const C=createContext(null)
export function AuthProvider({children}){
  const[user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('pl_user')||sessionStorage.getItem('pl_user')||'null')}catch{return null}})
  const login=(u,remember)=>{setUser(u);(remember?localStorage:sessionStorage).setItem('pl_user',JSON.stringify(u));if(u.theme)document.documentElement.setAttribute('data-theme',u.theme)}
  const logout=()=>{setUser(null);localStorage.removeItem('pl_user');sessionStorage.removeItem('pl_user')}
  const updateUser=(u)=>{setUser(u);if(localStorage.getItem('pl_user'))localStorage.setItem('pl_user',JSON.stringify(u));else sessionStorage.setItem('pl_user',JSON.stringify(u));if(u.theme)document.documentElement.setAttribute('data-theme',u.theme)}
  useEffect(()=>{if(user?.theme)document.documentElement.setAttribute('data-theme',user.theme)},[])
  return<C.Provider value={{user,login,logout,updateUser}}>{children}</C.Provider>
}
export const useAuth=()=>useContext(C)
