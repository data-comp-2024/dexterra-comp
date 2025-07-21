from abc import ABC, abstractmethod
from typing import Any, Tuple

class MLModel(ABC):
    """
    Abstract base class for a generic machine learning model.
    Requires implementation of train and test methods.
    """

    @abstractmethod
    def train(self, X: Any, y: Any) -> None:
        """
        Train the model on the provided features X and labels y.

        Parameters:
        ----------
        X : Any
            Training data features (e.g., numpy array, pandas DataFrame).
        y : Any
            Training data labels (e.g., numpy array, pandas Series).
        """
        pass

    @abstractmethod
    def predict(self, X: Any) -> Tuple[Any, float]:
        """
        Evaluate the model on test data and return predictions and performance metric.

        Parameters:
        ----------
        X : Any
            Test data features.
        y : Any
            True labels for test data.

        Returns:
        -------
        Tuple[Any, float]
            A tuple containing model predictions and a performance score (e.g., accuracy or loss).
        """
        pass