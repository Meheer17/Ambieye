package auth

import (
	"errors"
	"time"

	"github.com/Meheer17/ambieye/internal/db/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// TokenDetails contains access and refresh token details
type TokenDetails struct {
	AccessToken  string
	RefreshToken string
	AccessUUID   string
	RefreshUUID  string
	AtExpires    int64
	RtExpires    int64
}

// AccessTokenClaims represents the claims in the access token
type AccessTokenClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	UUID   string `json:"uuid"`
	jwt.RegisteredClaims
}

// RefreshTokenClaims represents the claims in the refresh token
type RefreshTokenClaims struct {
	UserID string `json:"user_id"`
	UUID   string `json:"uuid"`
	jwt.RegisteredClaims
}

// CreateTokens creates both access and refresh tokens for a user
func CreateTokens(user models.User, secret string, accessExpiry time.Duration, refreshExpiry time.Duration) (*TokenDetails, error) {
	td := &TokenDetails{}
	td.AtExpires = time.Now().Add(accessExpiry).Unix()
	td.AccessUUID = uuid.New().String()

	td.RtExpires = time.Now().Add(refreshExpiry).Unix()
	td.RefreshUUID = uuid.New().String()

	expiresAt := time.Unix(td.AtExpires, 0)
	rtExpiresAt := time.Unix(td.RtExpires, 0)

	// Access token
	atClaims := AccessTokenClaims{
		UserID: user.ID.Hex(),
		Role:   user.Role,
		UUID:   td.AccessUUID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	at := jwt.NewWithClaims(jwt.SigningMethodHS256, atClaims)
	var err error
	td.AccessToken, err = at.SignedString([]byte(secret))
	if err != nil {
		return nil, err
	}

	// Refresh token
	rtClaims := RefreshTokenClaims{
		UserID: user.ID.Hex(),
		UUID:   td.RefreshUUID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(rtExpiresAt),
		},
	}

	rt := jwt.NewWithClaims(jwt.SigningMethodHS256, rtClaims)
	td.RefreshToken, err = rt.SignedString([]byte(secret))
	if err != nil {
		return nil, err
	}

	return td, nil
}

// VerifyToken validates the JWT token string
func VerifyToken(tokenString string, secret string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Name}))

	if err != nil {
		return nil, err
	}

	return token, nil
}

// ExtractTokenClaims extracts the access token claims
func ExtractTokenClaims(token *jwt.Token) (*AccessTokenClaims, error) {
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		return nil, errors.New("invalid user_id claim")
	}

	role, ok := claims["role"].(string)
	if !ok {
		return nil, errors.New("invalid role claim")
	}

	uuid, ok := claims["uuid"].(string)
	if !ok {
		return nil, errors.New("invalid uuid claim")
	}

	return &AccessTokenClaims{
		UserID: userID,
		Role:   role,
		UUID:   uuid,
	}, nil
}
