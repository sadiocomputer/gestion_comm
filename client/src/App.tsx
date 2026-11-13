import { lazy, type ComponentType } from 'react'
import { Route, Routes } from 'react-router'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { RequirePermission } from './auth/RequirePermission'
import { AppLayout } from './components/AppLayout'
// Chargés tout de suite : premier écran (connexion), accueil, page 404.
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'

/**
 * Chargement à la demande : le code d'un écran n'est téléchargé que lorsqu'on
 * l'ouvre. React.lazy attend un export par défaut ; nos pages ont des exports
 * nommés, d'où ce petit adaptateur.
 */
function page<K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => loader().then((module) => ({ default: module[name] })))
}

const NewSalePage = page(() => import('./pages/sales/NewSalePage'), 'NewSalePage')
const SalesPage = page(() => import('./pages/sales/SalesPage'), 'SalesPage')
const SaleDetailPage = page(() => import('./pages/sales/SaleDetailPage'), 'SaleDetailPage')
const FinancePage = page(() => import('./pages/finance/FinancePage'), 'FinancePage')
const ReportsPage = page(() => import('./pages/reports/ReportsPage'), 'ReportsPage')
const ExpensesPage = page(() => import('./pages/expenses/ExpensesPage'), 'ExpensesPage')
const ExpenseCategoriesPage = page(() => import('./pages/expenses/ExpenseCategoriesPage'), 'ExpenseCategoriesPage')
const ProductsPage = page(() => import('./pages/products/ProductsPage'), 'ProductsPage')
const ProductDetailPage = page(() => import('./pages/products/ProductDetailPage'), 'ProductDetailPage')
const ProductFormPage = page(() => import('./pages/products/ProductFormPage'), 'ProductFormPage')
const CategoriesPage = page(() => import('./pages/products/CategoriesPage'), 'CategoriesPage')
const UnitsPage = page(() => import('./pages/products/UnitsPage'), 'UnitsPage')
const StockMovementsPage = page(() => import('./pages/stock/StockMovementsPage'), 'StockMovementsPage')
const ClientsPage = page(() => import('./pages/clients/ClientsPage'), 'ClientsPage')
const ClientDetailPage = page(() => import('./pages/clients/ClientDetailPage'), 'ClientDetailPage')
const ClientFormPage = page(() => import('./pages/clients/ClientFormPage'), 'ClientFormPage')
const SuppliersPage = page(() => import('./pages/suppliers/SuppliersPage'), 'SuppliersPage')
const SupplierDetailPage = page(() => import('./pages/suppliers/SupplierDetailPage'), 'SupplierDetailPage')
const SupplierFormPage = page(() => import('./pages/suppliers/SupplierFormPage'), 'SupplierFormPage')
const UsersPage = page(() => import('./pages/UsersPage'), 'UsersPage')
const UserDetailPage = page(() => import('./pages/UserDetailPage'), 'UserDetailPage')
const UserCreatePage = page(() => import('./pages/UserCreatePage'), 'UserCreatePage')
const RolesPage = page(() => import('./pages/RolesPage'), 'RolesPage')
const RoleFormPage = page(() => import('./pages/RoleFormPage'), 'RoleFormPage')
const ProfilePage = page(() => import('./pages/ProfilePage'), 'ProfilePage')

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

            <Route element={<RequirePermission permission={['sales.create', 'sales.read']} />}>
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/sales/:id" element={<SaleDetailPage />} />
            </Route>
            <Route element={<RequirePermission permission="sales.create" />}>
              <Route path="/sales/new" element={<NewSalePage />} />
            </Route>

            <Route
              element={<RequirePermission permission={['payments.read', 'supplier_payments.read']} />}
            >
              <Route path="/finance" element={<FinancePage />} />
            </Route>

            <Route element={<RequirePermission permission="reports.read" />}>
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            <Route element={<RequirePermission permission="expenses.read" />}>
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/expenses/categories" element={<ExpenseCategoriesPage />} />
            </Route>

            <Route element={<RequirePermission permission="products.read" />}>
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/categories" element={<CategoriesPage />} />
              <Route path="/products/units" element={<UnitsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
            </Route>
            <Route element={<RequirePermission permission="products.create" />}>
              <Route path="/products/new" element={<ProductFormPage />} />
            </Route>
            <Route element={<RequirePermission permission="products.update" />}>
              <Route path="/products/:id/edit" element={<ProductFormPage />} />
            </Route>
            <Route element={<RequirePermission permission="stock.read" />}>
              <Route path="/stock" element={<StockMovementsPage />} />
            </Route>

            <Route element={<RequirePermission permission="clients.read" />}>
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />
            </Route>
            <Route element={<RequirePermission permission="clients.create" />}>
              <Route path="/clients/new" element={<ClientFormPage />} />
            </Route>
            <Route element={<RequirePermission permission="clients.update" />}>
              <Route path="/clients/:id/edit" element={<ClientFormPage />} />
            </Route>

            <Route element={<RequirePermission permission="suppliers.read" />}>
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
            </Route>
            <Route element={<RequirePermission permission="suppliers.create" />}>
              <Route path="/suppliers/new" element={<SupplierFormPage />} />
            </Route>
            <Route element={<RequirePermission permission="suppliers.update" />}>
              <Route path="/suppliers/:id/edit" element={<SupplierFormPage />} />
            </Route>

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
