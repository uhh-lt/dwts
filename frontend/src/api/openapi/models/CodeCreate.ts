/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CodeCreate = {
  /**
   * Name of the Code
   */
  name: string;
  /**
   * Color of the Code
   */
  color?: string | null;
  /**
   * Description of the Code
   */
  description: string;
  /**
   * Parent of the Code
   */
  parent_code_id?: number | null;
  /**
   * Project the Code belongs to
   */
  project_id: number;
  /**
   * User the Code belongs to
   */
  user_id: number;
};
