package net.sosyge.formflow.mybatis.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;

/**
 * Map&lt;String,Object&gt; ↔ MySQL JSON 컬럼 TypeHandler. (validation 컬럼)
 * ObjectMapper 주입, null 안전 처리.
 */
@Slf4j
@Component
public class JsonMapTypeHandler extends BaseTypeHandler<Map<String, Object>> {

    private static final TypeReference<Map<String, Object>> TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper;

    public JsonMapTypeHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void setParameter(PreparedStatement ps, int i, Map<String, Object> parameter, JdbcType jdbcType)
            throws SQLException {
        ps.setString(i, serialize(parameter));
    }

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, Map<String, Object> parameter, JdbcType jdbcType)
            throws SQLException {
        ps.setString(i, serialize(parameter));
    }

    @Override
    public Map<String, Object> getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return deserialize(rs.getString(columnName));
    }

    @Override
    public Map<String, Object> getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return deserialize(rs.getString(columnIndex));
    }

    @Override
    public Map<String, Object> getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return deserialize(cs.getString(columnIndex));
    }

    private String serialize(Map<String, Object> value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            log.error("[JSON] map serialize failed", e);
            throw new IllegalStateException("JSON 직렬화 실패", e);
        }
    }

    private Map<String, Object> deserialize(String json) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, TYPE);
        } catch (Exception e) {
            log.error("[JSON] map deserialize failed: {}", json, e);
            throw new IllegalStateException("JSON 역직렬화 실패", e);
        }
    }
}
