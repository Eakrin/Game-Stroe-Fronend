import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Register } from './pages/register/register';
import { Login } from './pages/login/login';
import { Main } from './pages/main/main';
import { Profile } from './pages/profile/profile';
import { EditProfile } from './pages/edit-profile/edit-profile';
import { Topup } from './pages/topup/topup';
import { Admin } from './pages/admin/admin';
import { Allgame } from './pages/allgame/allgame';
import { Gameadmin } from './pages/gameadmin/gameadmin';
import { GameDetail } from './pages/game-detail/game-detail';
import { TopupHistory } from './pages/topup-history/topup-history';
import { PurchaseHistory } from './pages/purchase-history/purchase-history';
import { AdminTransactions } from './pages/admin-transactions/admin-transactions';
import { Cart } from './pages/cart/cart';
import { Library } from './pages/library/library';



export const routes: Routes = [
    {path: '', component: Home},
    {path: 'register', component: Register},
    {path: 'login', component: Login},
    {path: 'main', component: Home},
    {path: 'profile', component: Profile},
    {path: 'profile/edit', component: EditProfile},
    {path: 'admin', component: Admin},
    {path: 'profile/topup', component: Topup},
    {path: 'allgame', component: Allgame},
    {path: 'admin/admingames', component: Gameadmin},
    { path: 'game/:id', component: GameDetail },
     { path: 'profile/history', component: TopupHistory },
     { path: 'profile/purchasehistory', component: PurchaseHistory },
     {path: 'admin/transactions', component: AdminTransactions},
     {path: 'cart', component: Cart},
     {path: 'profile/library', component: Library},


];
