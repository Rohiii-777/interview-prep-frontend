export type Category = { id: number; name: string };
export type Qna = {
  id: number;
  question: string;
  answer?: string;
  is_done: boolean;
  bookmark: boolean;
  category_id?: number;
};
