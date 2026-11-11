import { Route, Routes } from 'react-router'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { RequirePermission } from './auth/RequirePermission'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProfilePage } from './pages/ProfilePage'
import { RoleFormPage } from './pages/RoleFormPage'
import { RolesPage } from './pages/RolesPage'
import { UserCreatePage } from './pages/UserCreatePage'
import { UserDetailPage } from './pages/UserDetailPage'
import { UsersPage } from './pages/UsersPage'

function App() {
  return (
    <div className="min-h-svh bg-slate-50">
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Toutes les routes ici exigent une session et partagent le menu. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<RequirePermission permission="users.read" />}>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
            </Route>
            <Route element={<RequirePermission permission="users.create" />}>
              <Route path="/users/new" element={<UserCreatePage />} />
            </Route>

            <Route element={<RequirePermission permission="roles.read" />}>
              <Route path="/roles" element={<RolesPage />} />
              <Route path="/roles/:id" element={<RoleFormPage />} />
            </Route>
            <Route element={<RequirePermission permission="roles.create" />}>
              <Route path="/roles/new" element={<RoleFormPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App
