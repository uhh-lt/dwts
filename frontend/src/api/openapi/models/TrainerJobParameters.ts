/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TrainerJobParameters = {
  /**
   * The ID of the Project.
   */
  project_id: number;
  /**
   * The name of the model.
   */
  train_model_name: string;
  /**
   * The name of the training dataloader.
   */
  train_dataloader_name: string;
  /**
   * The epochs to train.
   */
  epochs: number;
};
