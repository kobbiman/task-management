import { observable, action } from 'mobx';
import TaskModel from './TaskModel';
import ListModel from './ListModel';
import ApiClient from '../../common/api/ApiClient';
import _ from 'lodash';

export default class ProjectModel {
  store;
  id;
  @observable name;
  @observable description;
  @observable isTemplate;
  @observable status;
  @observable tasks;
  @observable isUpdating = false;
  @observable isDeleting = false;
  @observable isCreatingTask = false;

  constructor(store, id, name, description, isTemplate, status) {
    this.store = store;
    this.id = id;
    this.name = name;
    this.description = description;
    this.isTemplate = isTemplate;
    this.status = status;
    this.tasks = new ListModel(::this.fetchTasks);
  }

  @action async update(updates) {
    this.isUpdating = true;
    try {
      const originalStatus = this.status;
      await this.store.apiClient.updateProject(this.id, updates);
      _.assign(this, updates);
      if (updates.status && updates.status !== originalStatus) {
        this.store.onProjectStatusChanged(this, originalStatus, updates.status);
      }
    } catch (error) {
      // TODO: handle error
      console.log(error);
    } finally {
      this.isUpdating = false;
    }
  }

  @action async delete() {
    this.isDeleting = true;
    try {
      await this.store.apiClient.deleteProject(this.id);
      this.store.onProjectDeleted(this);
    } catch (error) {
      // TODO: handle error
      console.log(error);
    } finally {
      this.isDeleting = false;
    }
  }

  @action async createTask(name) {
    this.isCreatingTask = true;
    try {
      const task = this.deserializeTask(await this.store.apiClient.createTask(this.id, { name }));
      this.tasks.add(task);
    } catch (error) {
      // TODO: handle error
      console.log(error);
    } finally {
      this.isCreatingTask = false;
    }
  }

  @action onTaskDeleted(task) {
    this.tasks.remove(task);
  }

  async fetchTasks() {
    const result = await this.store.apiClient.getTasks(this.id);
    return result.map(task => this.deserializeTask(task));
  }

  deserializeTask(task) {
    return TaskModel.fromJS(this.store, this, task);
  }

  toJS() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isTemplate: this.isTemplate,
      status: this.status,
    };
  }

  static fromJS(store, source) {
    return new ProjectModel(
      store,
      source.id,
      source.name,
      source.description,
      source.isTemplate,
      source.status
    );
  }
}
