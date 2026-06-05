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
import java.util.List;

/**
 * List&lt;String&gt; ↔ MySQL JSON 컬럼 TypeHandler.
 *
 * <p>Spring 빈으로 등록되어 ObjectMapper를 주입받는다(new ObjectMapper() 금지).
 * mybatis-spring-boot-starter가 TypeHandler 빈을 Configuration에 자동 등록하므로,
 * XML에서 {@code typeHandler="...JsonListTypeHandler"} 로 참조하면 이 인스턴스가 사용된다.
 */
@Slf4j
@Component
public class JsonListTypeHandler extends BaseTypeHandler<List<String>> {

    private static final TypeReference<List<String>> TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper;

    public JsonListTypeHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** null도 안전하게 처리 (BaseTypeHandler의 jdbcType 강제 검사 우회). */
    @Override
    public void setParameter(PreparedStatement ps, int i, List<String> parameter, JdbcType jdbcType)
            throws SQLException {
        ps.setString(i, serialize(parameter));
    }

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, List<String> parameter, JdbcType jdbcType)
            throws SQLException {
        ps.setString(i, serialize(parameter));
    }

    @Override
    public List<String> getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return deserialize(rs.getString(columnName));
    }

    @Override
    public List<String> getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return deserialize(rs.getString(columnIndex));
    }

    @Override
    public List<String> getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return deserialize(cs.getString(columnIndex));
    }

    private String serialize(List<String> value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            log.error("[JSON] list serialize failed", e);
            throw new IllegalStateException("JSON 직렬화 실패", e);
        }
    }

    private List<String> deserialize(String json) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, TYPE);
        } catch (Exception e) {
            log.error("[JSON] list deserialize failed: {}", json, e);
            throw new IllegalStateException("JSON 역직렬화 실패", e);
        }
    }
}
