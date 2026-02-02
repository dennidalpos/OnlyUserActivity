const path = require('path');
const config = require('../../config');
const fileStorage = require('../storage/fileStorage');

class QuickActionsService {
  constructor() {
    this.quickActionsPath = path.join(config.storage.rootPath, 'admin', 'quick-actions.json');
    this.defaultQuickActions = [
      {
        id: 'quick-assenza',
        label: 'Assenza',
        notes: 'Assenza'
      },
      {
        id: 'quick-lavoro-feriale',
        label: 'Lavoro feriale',
        notes: 'Lavoro feriale'
      },
      {
        id: 'quick-part-time-4-ore',
        label: 'Part-time 4 ore',
        notes: 'Part-time 4 ore'
      },
      {
        id: 'quick-lavoro-3turni-mattino',
        label: 'Lavoro su turni - mattino',
        notes: 'Lavoro su turni - mattino'
      },
      {
        id: 'quick-lavoro-3turni-pomeriggio',
        label: 'Lavoro su turni - pomeriggio',
        notes: 'Lavoro su turni - pomeriggio'
      },
      {
        id: 'quick-lavoro-3turni-notte',
        label: 'Lavoro su turni - notte',
        notes: 'Lavoro su turni - notte'
      },
      {
        id: 'quick-ferie',
        label: 'Ferie',
        notes: 'Ferie'
      },
      {
        id: 'quick-malattia',
        label: 'Malattia',
        notes: 'Malattia'
      },
      {
        id: 'quick-congedo',
        label: 'Congedo',
        notes: 'Congedo'
      },
      {
        id: 'quick-riposo',
        label: 'Turno di riposo',
        notes: 'Turno di riposo'
      }
    ];
  }

  async getQuickActions() {
    try {
      const configData = await fileStorage.readJSON(this.quickActionsPath);
      const raw = Array.isArray(configData?.quickActions) ? configData.quickActions : this.defaultQuickActions;
      return this.normalizeQuickActions(raw);
    } catch (error) {
      return this.normalizeQuickActions(this.defaultQuickActions);
    }
  }

  async setQuickActions(actions) {
    if (!Array.isArray(actions)) {
      throw new Error('Le quick action devono essere un array');
    }
    const normalized = this.normalizeQuickActions(actions);
    await this.validateQuickActions(normalized);
    await fileStorage.writeJSON(this.quickActionsPath, {
      quickActions: normalized,
      updatedAt: new Date().toISOString()
    });
    return normalized;
  }

  async addQuickAction(payload) {
    const actions = await this.getQuickActions();
    const normalized = this.normalizeQuickActions([payload])[0];
    await this.validateQuickActions([normalized]);
    actions.push(normalized);
    return await this.setQuickActions(actions);
  }

  async updateQuickAction(id, payload) {
    const actions = await this.getQuickActions();
    const index = actions.findIndex(action => action.id === id);
    if (index === -1) {
      throw new Error('Quick action non trovata');
    }
    const updated = {
      ...actions[index],
      ...payload
    };
    const normalized = this.normalizeQuickActions([updated])[0];
    await this.validateQuickActions([normalized]);
    actions[index] = normalized;
    return await this.setQuickActions(actions);
  }

  async removeQuickAction(id) {
    const actions = await this.getQuickActions();
    const filtered = actions.filter(action => action.id !== id);
    if (filtered.length === actions.length) {
      throw new Error('Quick action non trovata');
    }
    return await this.setQuickActions(filtered);
  }

  normalizeQuickActions(actions) {
    const pauseLabels = new Set(['pausa', 'pause']);
    return actions
      .filter(action => action && action.label)
      .filter(action => action.activityType !== 'pausa' && action.isPause !== true)
      .filter(action => !pauseLabels.has(String(action.label).trim().toLowerCase()))
      .map((action) => {
        const label = String(action.label).trim();
        const activityType = 'altro';
        return {
          id: action.id || this.generateQuickActionId(label, activityType),
          label,
          activityType: 'altro',
          notes: action.notes ? String(action.notes) : ''
        };
      });
  }

  async validateQuickActions(actions) {
    const allowedTypes = new Set(['altro']);

    actions.forEach((action) => {
      if (!action.label) {
        throw new Error('Ogni quick action deve avere un\'etichetta');
      }
      if (!allowedTypes.has(action.activityType)) {
        throw new Error(`Tipo attività non valido per quick action: ${action.activityType}`);
      }
    });
  }

  generateQuickActionId(label, activityType) {
    const base = `${activityType}-${label}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}-${Date.now()}-${suffix}`;
  }
}

module.exports = new QuickActionsService();
