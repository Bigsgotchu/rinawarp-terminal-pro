export type RinaTransactionId = string

export type RinaMutationOperation =
  | 'write'
  | 'delete'
  | 'rename'
  | 'mkdir'
  | 'rmdir'
