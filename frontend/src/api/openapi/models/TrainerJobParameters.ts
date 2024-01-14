/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TrainerJobParameters = {
  /**
   * The ID of the Project.
   */
  project_id: number;
  /**
   * The name of the base model.
   */
  base_model_name?: string;
  /**
   * The name of the new model.
   */
  new_model_name: string;
};
