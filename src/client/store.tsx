/** @format */

import React, {
  createContext,
  useReducer,
  ReactNode,
  Dispatch,
} from "react";

// Define the shape of your state
interface State {
  period: "1h" | "24h" | "7d" | "14d" | "30d";
}

// Define the shape of your actions
type Action = { type: "setPeriod"; payload: "1h" | "24h" | "7d" | "14d" | "30d" };

// Create the initial state
const initialState: State = {
  period: window.localStorage.getItem("period") as "1h" | "24h" | "7d" | "14d" | "30d",
};

// Create a reducer function
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "setPeriod":
      return { ...state, period: action.payload };
    default:
      return state;
  }
};

// Create the context
const StoreContext = createContext<{
  state: State;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => undefined,
});

// Create a provider component
const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export { StoreContext, StoreProvider };
