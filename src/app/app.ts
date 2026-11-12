import { Component, inject } from '@angular/core';
import { AppHeader } from './components/app-header';
import { CanvasStage } from './components/canvas-stage';
import { ClearDialog, EditLabelDialog, NewViewDialog } from './components/dialogs';
import { ExplorerSidebar } from './components/explorer-sidebar';
import { PaletteSidebar } from './components/palette-sidebar';
import { DiagramStore } from './services/diagram-store';

@Component({
  selector: 'app-root',
  imports: [
    AppHeader,
    PaletteSidebar,
    CanvasStage,
    ExplorerSidebar,
    EditLabelDialog,
    ClearDialog,
    NewViewDialog,
  ],
  templateUrl: './app.html',
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
      }
    `,
  ],
})
export class App {
  protected readonly store = inject(DiagramStore);
}

