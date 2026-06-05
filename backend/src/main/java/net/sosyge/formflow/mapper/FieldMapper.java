package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.FormField;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface FieldMapper {

    void insert(FormField field);

    List<FormField> findByFormIdOrderByOrderNum(@Param("formId") Long formId);

    Optional<FormField> findByIdAndFormId(@Param("id") Long id, @Param("formId") Long formId);

    void updateField(FormField field);

    void updateOrder(@org.apache.ibatis.annotations.Param("id") Long id,
                     @org.apache.ibatis.annotations.Param("orderNum") int orderNum);

    int deleteByIdAndFormId(@Param("id") Long id, @Param("formId") Long formId);

    long countByFormId(@Param("formId") Long formId);

    /** 현재 최대 order_num (없으면 null). */
    Integer maxOrderNum(@Param("formId") Long formId);

    /** 삭제된 order보다 큰 필드들의 order_num을 1씩 당긴다. */
    void shiftOrderAfterDelete(@Param("formId") Long formId, @Param("deletedOrder") int deletedOrder);
}
