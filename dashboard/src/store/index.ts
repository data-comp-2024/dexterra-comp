import { configureStore } from '@reduxjs/toolkit'
import filterReducer from './slices/filterSlice'
import userReducer from './slices/userSlice'
import uiReducer from './slices/uiSlice'
import dataReducer from './slices/dataSlice'

export const store = configureStore({
  reducer: {
    filters: filterReducer,
    user: userReducer,
    ui: uiReducer,
    data: dataReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

