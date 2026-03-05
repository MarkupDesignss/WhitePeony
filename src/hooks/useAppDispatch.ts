// src/hooks/useAppDispatch.ts
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../redux/store';

export const useAppDispatch = () => useDispatch<AppDispatch>();