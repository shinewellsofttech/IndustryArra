import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import createSagaMiddleware from 'redux-saga';

import PostsReducer from './reducers/PostsReducer';
import { AuthReducer } from './reducers/AuthReducer';
import todoReducers from './reducers/Reducers';
import rootSaga from './sagas';

// Initialize Saga middleware
const sagaMiddleware = createSagaMiddleware();

// Combine reducers
const reducers = combineReducers({
    posts: PostsReducer,
    auth: AuthReducer,
    todoReducers,
});

// Redux DevTools for debugging
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Create the store with middlewares (thunk and saga)
export const store = createStore(
    reducers,
    composeEnhancers(applyMiddleware(thunk, sagaMiddleware))
);

// Run the saga middleware
sagaMiddleware.run(rootSaga);

export default store;
