import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppHeader } from '../components/app-header';
import { CanvasStage } from '../components/canvas-stage';
import { ClearDialog, EditLabelDialog, NewViewDialog } from '../components/dialogs';
import { ExplorerSidebar } from '../components/explorer-sidebar';
import { PaletteSidebar } from '../components/palette-sidebar';
import { RevisionsDialog } from '../components/revisions-dialog';
import { DiagramPersistenceService } from '../services/diagram-persistence.service';
import { DiagramStore } from '../services/diagram-store';

@Component({
  selector: 'app-diagram-editor',
  imports: [
    DragDropModule,
    RouterLink,
    AppHeader,
    PaletteSidebar,
    CanvasStage,
    ExplorerSidebar,
    EditLabelDialog,
    ClearDialog,
    NewViewDialog,
    RevisionsDialog,
  ],
  templateUrl: './diagram-editor.html',
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
export class DiagramEditorPage implements OnInit, OnDestroy {
  protected readonly store = inject(DiagramStore);
  protected readonly persistence = inject(DiagramPersistenceService);
  private readonly route = inject(ActivatedRoute);

  private readonly warnOnUnload = (event: BeforeUnloadEvent): void => {
    if (!this.persistence.dirty()) return;
    event.preventDefault();
    event.returnValue = '';
  };

  ngOnInit(): void {
    const diagramId = Number(this.route.snapshot.paramMap.get('diagramId'));
    if (!Number.isInteger(diagramId) || diagramId <= 0) {
      this.persistence.fail('That diagram link is not valid.');
      return;
    }
    window.addEventListener('beforeunload', this.warnOnUnload);
    this.persistence.open(diagramId);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.warnOnUnload);
    this.persistence.close();
  }
}
