import { NgModule } from '@angular/core';
import { featureName, genericReducer } from './store/reducers';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { GenericSetupComponent } from './generic-setup.component';
import { RouterModule } from '@angular/router';
import { GenericSEtupEffects } from './store/effects';
import { GenericTypeComponent } from './generic-type/generic-type.component';
import { sessionStorageMetaReducer } from './store/session-storage-meta-reducer';

const storeMod = StoreModule.forFeature(featureName, genericReducer, { metaReducers: [sessionStorageMetaReducer] });

@NgModule({
  imports: [
    storeMod,
    GenericSetupComponent,
    GenericTypeComponent,
    EffectsModule.forFeature(GenericSEtupEffects),
    RouterModule.forChild([{
      path: "",
      pathMatch: "prefix",
      component: GenericSetupComponent
    }, {
      path: "type/:type",
      component: GenericTypeComponent
    }])]
})
export class GenericSetupModule {

}


// loadComponent: () => import('./generic-setup/generic-setup.component').then(m => m.GenericSetupComponent)