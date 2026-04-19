export type TextReviewPathPart = string | number;

export type TextReviewTarget = {
  path: TextReviewPathPart[];
  text: string;
};

export type TextReviewBatch = {
  items: { id: string; text: string }[];
  totalChars: number;
};
