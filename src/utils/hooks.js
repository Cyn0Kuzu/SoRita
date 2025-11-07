/**
 * Custom React Hooks Utilities
 * Modern custom hooks for SoRita application
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Keyboard, Dimensions } from 'react-native';

// Hook for handling app state changes
export const useAppState = () => {
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  return {
    appState,
    isActive: appState === 'active',
    isBackground: appState === 'background',
    isInactive: appState === 'inactive',
  };
};

// Hook for keyboard visibility
export const useKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible,
    dismissKeyboard: Keyboard.dismiss,
  };
};

// Hook for screen dimensions and orientation
export const useScreenDimensions = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  return {
    ...dimensions,
    isLandscape: dimensions.width > dimensions.height,
    isPortrait: dimensions.height > dimensions.width,
    aspectRatio: dimensions.width / dimensions.height,
  };
};

// Hook for debounced values
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for throttled values
export const useThrottle = (value, limit) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(
      () => {
        if (Date.now() - lastRan.current >= limit) {
          setThrottledValue(value);
          lastRan.current = Date.now();
        }
      },
      limit - (Date.now() - lastRan.current)
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

// Hook for previous value
export const usePrevious = (value) => {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
};

// Hook for async operations
export const useAsync = (asyncFunction, dependencies = []) => {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (...args) => {
    setState({ data: null, loading: true, error: null });

    try {
      const result = await asyncFunction(...args);
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      setState({ data: null, loading: false, error });
      throw error;
    }
  }, dependencies);

  return { ...state, execute };
};

// Hook for form validation
export const useFormValidation = (initialValues, validationRules) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouchedFields] = useState({});

  const validateField = useCallback(
    (name, value) => {
      const rules = validationRules[name];
      if (!rules) return null;

      for (const rule of rules) {
        const result = rule.validator(value);
        if (!result.isValid) {
          return result.error;
        }
      }
      return null;
    },
    [validationRules]
  );

  const setValue = useCallback(
    (name, value) => {
      setValues((prev) => ({ ...prev, [name]: value }));

      // Validate if field has been touched
      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched, validateField]
  );

  const setTouched = useCallback(
    (name) => {
      setTouchedFields((prev) => ({ ...prev, [name]: true }));

      // Validate on first touch
      const error = validateField(name, values[name]);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [values, validateField]
  );

  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((name) => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouchedFields(
      Object.keys(validationRules).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {})
    );

    return isValid;
  }, [values, validationRules, validateField]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouchedFields({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched,
    validateAll,
    resetForm,
    isValid: Object.keys(errors).length === 0,
  };
};

// Hook for local storage
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Check if localStorage is available (web only)
      if (typeof window === 'undefined' || !window.localStorage) {
        return initialValue;
      }
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        // Check if localStorage is available (web only)
        if (typeof window === 'undefined' || !window.localStorage) {
          setStoredValue(value instanceof Function ? value(storedValue) : value);
          return;
        }
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
};

// Hook for toggle functionality
export const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return [value, toggle, setTrue, setFalse];
};

// Hook for array operations
export const useArray = (initialArray = []) => {
  const [array, setArray] = useState(initialArray);

  const push = useCallback((element) => {
    setArray((arr) => [...arr, element]);
  }, []);

  const remove = useCallback((index) => {
    setArray((arr) => arr.filter((_, i) => i !== index));
  }, []);

  const removeById = useCallback((id) => {
    setArray((arr) => arr.filter((item) => item.id !== id));
  }, []);

  const update = useCallback((index, newElement) => {
    setArray((arr) => arr.map((item, i) => (i === index ? newElement : item)));
  }, []);

  const updateById = useCallback((id, newElement) => {
    setArray((arr) => arr.map((item) => (item.id === id ? newElement : item)));
  }, []);

  const clear = useCallback(() => {
    setArray([]);
  }, []);

  const reset = useCallback(() => {
    setArray(initialArray);
  }, [initialArray]);

  return {
    array,
    set: setArray,
    push,
    remove,
    removeById,
    update,
    updateById,
    clear,
    reset,
  };
};

// Hook for countdown timer
export const useCountdown = (initialTime) => {
  const [time, setTime] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);

  const start = useCallback(() => setIsActive(true), []);
  const pause = useCallback(() => setIsActive(false), []);
  const reset = useCallback(() => {
    setTime(initialTime);
    setIsActive(false);
  }, [initialTime]);

  useEffect(() => {
    let interval = null;

    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((time) => time - 1);
      }, 1000);
    } else if (time === 0) {
      setIsActive(false);
    }

    return () => clearInterval(interval);
  }, [isActive, time]);

  return {
    time,
    isActive,
    start,
    pause,
    reset,
    isExpired: time === 0,
  };
};

// Hook for online status
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Only available in web environment
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// Hook for periodic refresh
export const useInterval = (callback, delay) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => {
        savedCallback.current();
      }, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

// Hook for focus management
export const useFocus = () => {
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef(null);

  const setFocus = useCallback(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  const removeFocus = useCallback(() => {
    if (ref.current) {
      ref.current.blur();
    }
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (node) {
      const handleFocus = () => setIsFocused(true);
      const handleBlur = () => setIsFocused(false);

      node.addEventListener('focus', handleFocus);
      node.addEventListener('blur', handleBlur);

      return () => {
        node.removeEventListener('focus', handleFocus);
        node.removeEventListener('blur', handleBlur);
      };
    }
  }, []);

  return {
    ref,
    isFocused,
    setFocus,
    removeFocus,
  };
};

export default {
  useAppState,
  useKeyboard,
  useScreenDimensions,
  useDebounce,
  useThrottle,
  usePrevious,
  useAsync,
  useFormValidation,
  useLocalStorage,
  useToggle,
  useArray,
  useCountdown,
  useOnlineStatus,
  useInterval,
  useFocus,
};
