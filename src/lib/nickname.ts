const NICKNAME_KEY = 'kalle_user_nickname';

export const getNickname = (): string | null => {
  return localStorage.getItem(NICKNAME_KEY);
};

export const setNickname = (nickname: string): void => {
  localStorage.setItem(NICKNAME_KEY, nickname.trim());
};

export const hasNickname = (): boolean => {
  const nickname = getNickname();
  return nickname !== null && nickname.trim().length > 0;
};
