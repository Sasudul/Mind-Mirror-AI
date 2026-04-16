"""
MindMirror AI — ML Productivity Model
Lightweight scikit-learn model for productivity prediction.
"""

import numpy as np
from datetime import datetime
from typing import Dict, List, Optional


class ProductivityModel:
    """
    Predicts productivity score based on features.
    Uses a simple rule-based approach initially, with the ability to train
    on user-specific data over time.
    """

    def __init__(self):
        self.model = None
        self.is_trained = False
        self.feature_names = [
            "hour_of_day",
            "day_of_week",
            "focus_ratio",
            "stress_ratio",
            "avg_wpm",
            "error_rate",
            "consistency",
            "session_duration_min",
        ]

    def predict_rule_based(self, features: Dict) -> float:
        """
        Rule-based productivity prediction for cold-start scenarios.
        Returns a score between 0 and 100.
        """
        score = 50.0

        # Focus contribution (0-100 focus ratio)
        focus = features.get("focus_ratio", 0.5)
        score += (focus - 0.5) * 40  # -20 to +20

        # Stress penalty
        stress = features.get("stress_ratio", 0)
        score -= stress * 25  # 0 to -25

        # Typing consistency bonus
        consistency = features.get("consistency", 0.5)
        score += (consistency - 0.5) * 15  # -7.5 to +7.5

        # Error rate penalty
        error_rate = features.get("error_rate", 0.05)
        if error_rate > 0.15:
            score -= (error_rate - 0.15) * 50

        # Time-of-day adjustment (slightly higher in morning)
        hour = features.get("hour_of_day", 12)
        if 9 <= hour <= 11:
            score += 5
        elif 14 <= hour <= 15:
            score -= 3  # Post-lunch dip
        elif hour >= 22 or hour <= 5:
            score -= 8  # Late night penalty

        # Session duration fatigue
        duration = features.get("session_duration_min", 30)
        if duration > 120:
            score -= min(10, (duration - 120) / 30 * 3)

        return round(max(0, min(100, score)), 1)

    def extract_features(
        self,
        focus_ratio: float = 0.5,
        stress_ratio: float = 0,
        avg_wpm: float = 40,
        error_rate: float = 0.05,
        consistency: float = 0.7,
        session_duration_min: float = 30,
        timestamp: Optional[datetime] = None,
    ) -> Dict:
        """Extract feature dict from raw inputs."""
        ts = timestamp or datetime.utcnow()
        return {
            "hour_of_day": ts.hour,
            "day_of_week": ts.weekday(),
            "focus_ratio": focus_ratio,
            "stress_ratio": stress_ratio,
            "avg_wpm": avg_wpm,
            "error_rate": error_rate,
            "consistency": consistency,
            "session_duration_min": session_duration_min,
        }

    def predict(self, features: Dict) -> float:
        """Predict productivity score. Uses rule-based for cold start."""
        if self.is_trained and self.model is not None:
            feature_array = np.array([[
                features[name] for name in self.feature_names
            ]])
            prediction = self.model.predict(feature_array)[0]
            return round(max(0, min(100, prediction)), 1)

        return self.predict_rule_based(features)


productivity_model = ProductivityModel()
